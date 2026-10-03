import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, X, FileText } from 'lucide-react';
import { UnitType } from '../../types';
import * as XLSX from 'xlsx';

interface ProductImportModalProps {
  onClose: () => void;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({ onClose }) => {
  const { language, categories, bulkImportProducts, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sample CSV template download
  const downloadSampleCSV = () => {
    const headers = 'Item & SKU,Added Date,Generic,Brand / Company,Strength,Dosage & Rules,Category,Barcode,Batch No,Exp. Date,Cost Price,Sales Price,Margin,Stock,Total Asset\n';
    const sample1 = 'Napa Extra (NAPA-EXT-500),2026-01-15,Paracetamol + Caffeine,Beximco Pharmaceuticals,500mg+65mg,Tablet (১+০+১ ভরা পেটে),Medicine,8901234567890,BAT99,2028-12-31,2.10,2.50,19.00%,500,1050.00\n';
    const sample2 = 'Seclo 20mg (SECLO-20),2026-02-10,Omeprazole,Square Pharmaceuticals,20mg,Capsule (১+০+১ খাওয়ার আগে),Medicine,8909876543210,SEC102,2027-10-15,5.00,6.00,20.00%,300,1500.00\n';
    
    // Create UTF-8 BOM so Excel opens Bengali and Unicode text properly
    const blob = new Blob(['\uFEFF' + headers + sample1 + sample2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 1) {
            setErrorMsg(language === 'bn' ? 'এক্সেল ফাইলটি খালি।' : 'Excel file is empty.');
            return;
          }

          const headerRow = jsonData[0].map((h: any) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
          const hasHeader = headerRow.some(h => h.includes('name') || h.includes('sku') || h.includes('price') || h.includes('product') || h.includes('stock') || h.includes('category') || h.includes('নাম'));

          const startIndex = hasHeader ? 1 : 0;
          const rows = [];

          for (let i = startIndex; i < jsonData.length; i++) {
            const rowData = jsonData[i].map((val: any) => String(val !== undefined && val !== null ? val : '').trim());
            if (rowData.length > 0 && rowData.some(val => val !== '')) {
              const getName = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('name') || h.includes('product') || h.includes('title') || h.includes('নাম'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[0] || `Product ${i}`;
              };

              const getSku = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('sku') || h.includes('code'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[1] || `SKU-${Date.now()}-${i}`;
              };

              const getBarcode = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('barcode') || h.includes('ean') || h.includes('upc'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[2] || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
              };

              const getCategory = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('category') || h.includes('cat') || h.includes('ক্যাটাগরি'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[3] || 'General';
              };

              const getGeneric = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('generic') || h.includes('জেনেরিক'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[4] || '';
              };

              const getManufacturer = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('manufacturer') || h.includes('brand') || h.includes('company') || h.includes('কোম্পানি') || h.includes('ব্র্যান্ড'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[5] || '';
              };

              const getStrength = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('strength') || h.includes('mg') || h.includes('স্ট্রেন্থ') || h.includes('শক্তি'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[6] || '';
              };

              const getDosageForm = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('dosage') || h.includes('form') || h.includes('ডোজ') || h.includes('টাইপ'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[7] || '';
              };

              const getPurchasePrice = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('purchase') || h.includes('cost') || h.includes('buy') || h.includes('ক্রয়'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[8]) || 0;
              };

              const getSalesPrice = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('sale') || h.includes('price') || h.includes('retail') || h.includes('বিক্রয়'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[9]) || 0;
              };

              const getStock = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('স্টক'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[10]) || 0;
              };

              const getUnit = (): UnitType => {
                let unitVal = 'Pcs';
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('unit') || h.includes('measure') || h.includes('একক'));
                  if (idx !== -1 && rowData[idx]) unitVal = rowData[idx];
                } else if (rowData[11]) {
                  unitVal = rowData[11];
                }
                const validUnits = ['Pcs', 'Kg', 'Ltr', 'Box', 'Pack', 'Dozen', 'Meter', 'Bag'];
                return (validUnits.includes(unitVal) ? unitVal : 'Pcs') as UnitType;
              };

              const getReorder = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('reorder') || h.includes('min') || h.includes('alert'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 10;
                }
                return parseFloat(rowData[12]) || 10;
              };

              const getBatch = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('batch') || h.includes('lot'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[13] || '';
              };

              const getExp = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('exp') || h.includes('expiry') || h.includes('date'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[14] || '';
              };

              const getRack = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('rack') || h.includes('shelf') || h.includes('location') || h.includes('র্যাক'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[15] || '';
              };

              const getStripSize = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('strip') || h.includes('packsize') || h.includes('পাতা'));
                  if (idx !== -1 && rowData[idx]) return parseInt(rowData[idx]) || undefined;
                }
                return rowData[16] ? parseInt(rowData[16]) : undefined;
              };

              const getDesc = () => {
                if (hasHeader) {
                  const idx = headerRow.findIndex(h => h.includes('desc') || h.includes('detail') || h.includes('বিবরণ'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[17] || '';
              };

              const name = getName();
              const sku = getSku();
              const barcode = getBarcode();
              const categoryName = getCategory();
              const generic = getGeneric();
              const manufacturer = getManufacturer();
              const strength = getStrength();
              const dosageForm = getDosageForm();
              const purchasePrice = getPurchasePrice();
              const salesPrice = getSalesPrice();
              const stock = getStock();
              const unit = getUnit();
              const reorderLevel = getReorder();
              const batchNumber = getBatch();
              const expDate = getExp();
              const rackLocation = getRack();
              const stripSize = getStripSize();
              const description = getDesc();

              const matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

              rows.push({
                name,
                sku,
                barcode,
                categoryId: matchedCat ? matchedCat.id : (categories[0]?.id || 'cat-default'),
                categoryName: matchedCat ? matchedCat.name : categoryName,
                generic,
                manufacturer,
                strength,
                dosageForm,
                purchasePrice,
                salesPrice,
                stock,
                unit,
                reorderLevel,
                batchNumber,
                expDate,
                rackLocation,
                stripSize,
                description,
              });
            }
          }

          if (rows.length === 0) {
            setErrorMsg(language === 'bn' ? 'এক্সেল ফাইলে কোনো বৈধ পণ্য পাওয়া যায়নি।' : 'No valid product rows found in Excel file.');
          } else {
            setParsedRows(rows);
          }
        } catch (err: any) {
          setErrorMsg(language === 'bn' ? 'এক্সেল ফাইল পড়তে সমস্যা হয়েছে: ' + err.message : 'Error reading Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV handling
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const fileText = event.target?.result as string;
          const fileLines = fileText ? fileText.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean) : [];
          if (fileLines.length < 1) {
            setErrorMsg(language === 'bn' ? 'ফাইলটি খালি।' : 'File is empty.');
            return;
          }

          const lines = fileLines;
          const firstLine = lines[0];
          const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

          const parseRow = (line: string, delim: string) => {
            const result = [];
            let insideQuote = false;
            let entry = '';
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                insideQuote = !insideQuote;
              } else if (char === delim && !insideQuote) {
                result.push(entry.trim().replace(/^"|"$/g, ''));
                entry = '';
              } else {
                entry += char;
              }
            }
            result.push(entry.trim().replace(/^"|"$/g, ''));
            return result;
          };

          const headers = parseRow(lines[0], delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
          const hasHeader = headers.some(h => h.includes('name') || h.includes('sku') || h.includes('price') || h.includes('product') || h.includes('stock') || h.includes('category') || h.includes('নাম'));
          
          const startIndex = hasHeader ? 1 : 0;
          const rows = [];

          for (let i = startIndex; i < lines.length; i++) {
            const rowData = parseRow(lines[i], delimiter);
            if (rowData.length > 0 && rowData.some(val => val !== '')) {
              const getName = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('name') || h.includes('product') || h.includes('title') || h.includes('নাম'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[0] || `Product ${i}`;
              };

              const getSku = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('sku') || h.includes('code'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[1] || `SKU-${Date.now()}-${i}`;
              };

              const getBarcode = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('barcode') || h.includes('ean') || h.includes('upc'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[2] || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
              };

              const getCategory = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('category') || h.includes('cat') || h.includes('ক্যাটাগরি'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[3] || 'General';
              };

              const getGeneric = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('generic') || h.includes('জেনেরিক'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[4] || '';
              };

              const getManufacturer = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('manufacturer') || h.includes('brand') || h.includes('company') || h.includes('কোম্পানি') || h.includes('ব্র্যান্ড'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[5] || '';
              };

              const getStrength = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('strength') || h.includes('mg') || h.includes('স্ট্রেন্থ') || h.includes('শক্তি'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[6] || '';
              };

              const getDosageForm = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('dosage') || h.includes('form') || h.includes('ডোজ') || h.includes('টাইপ'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[7] || '';
              };

              const getPurchasePrice = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('purchase') || h.includes('cost') || h.includes('buy') || h.includes('ক্রয়'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[8]) || 0;
              };

              const getSalesPrice = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('sale') || h.includes('price') || h.includes('retail') || h.includes('বিক্রয়'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[9]) || 0;
              };

              const getStock = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('স্টক'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 0;
                }
                return parseFloat(rowData[10]) || 0;
              };

              const getUnit = (): UnitType => {
                let unitVal = 'Pcs';
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('unit') || h.includes('measure') || h.includes('একক'));
                  if (idx !== -1 && rowData[idx]) unitVal = rowData[idx];
                } else if (rowData[11]) {
                  unitVal = rowData[11];
                }
                const validUnits = ['Pcs', 'Kg', 'Ltr', 'Box', 'Pack', 'Dozen', 'Meter', 'Bag'];
                return (validUnits.includes(unitVal) ? unitVal : 'Pcs') as UnitType;
              };

              const getReorder = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('reorder') || h.includes('min') || h.includes('alert'));
                  if (idx !== -1 && rowData[idx]) return parseFloat(rowData[idx]) || 10;
                }
                return parseFloat(rowData[12]) || 10;
              };

              const getBatch = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('batch') || h.includes('lot'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[13] || '';
              };

              const getExp = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('exp') || h.includes('expiry') || h.includes('date'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[14] || '';
              };

              const getRack = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('rack') || h.includes('shelf') || h.includes('location') || h.includes('র্যাক'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[15] || '';
              };

              const getStripSize = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('strip') || h.includes('packsize') || h.includes('পাতা'));
                  if (idx !== -1 && rowData[idx]) return parseInt(rowData[idx]) || undefined;
                }
                return rowData[16] ? parseInt(rowData[16]) : undefined;
              };

              const getDesc = () => {
                if (hasHeader) {
                  const idx = headers.findIndex(h => h.includes('desc') || h.includes('detail') || h.includes('বিবরণ'));
                  if (idx !== -1 && rowData[idx]) return rowData[idx];
                }
                return rowData[17] || '';
              };

              const name = getName();
              const sku = getSku();
              const barcode = getBarcode();
              const categoryName = getCategory();
              const generic = getGeneric();
              const manufacturer = getManufacturer();
              const strength = getStrength();
              const dosageForm = getDosageForm();
              const purchasePrice = getPurchasePrice();
              const salesPrice = getSalesPrice();
              const stock = getStock();
              const unit = getUnit();
              const reorderLevel = getReorder();
              const batchNumber = getBatch();
              const expDate = getExp();
              const rackLocation = getRack();
              const stripSize = getStripSize();
              const description = getDesc();

              const matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

              rows.push({
                name,
                sku,
                barcode,
                categoryId: matchedCat ? matchedCat.id : (categories[0]?.id || 'cat-default'),
                categoryName: matchedCat ? matchedCat.name : categoryName,
                generic,
                manufacturer,
                strength,
                dosageForm,
                purchasePrice,
                salesPrice,
                stock,
                unit,
                reorderLevel,
                batchNumber,
                expDate,
                rackLocation,
                stripSize,
                description,
              });
            }
          }

          if (rows.length === 0) {
            setErrorMsg(language === 'bn' ? 'কোনো বৈধ পণ্যের তথ্য পাওয়া যায়নি। দয়া করে স্যাম্পল টেমপ্লেট ব্যবহার করুন।' : 'No valid product rows found in file. Please ensure columns match the sample template.');
          } else {
            setParsedRows(rows);
          }
        } catch (err: any) {
          setErrorMsg(language === 'bn' ? 'ফাইল পড়তে সমস্যা হয়েছে: ' + err.message : 'Error parsing file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setTimeout(() => {
      bulkImportProducts(parsedRows);
      setImporting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {language === 'bn' ? 'বাল্ক প্রোডাক্ট ইমপোর্ট (Excel / CSV)' : 'Bulk Product Import (CSV)'}
              </h3>
              <p className="text-xs text-zinc-500">
                {language === 'bn' ? 'একসাথে শত শত পণ্য ফাইল থেকে আপলোড করুন' : 'Import multiple products at once via CSV file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {language === 'bn' ? '১. প্রথমে স্যাম্পল টেমপ্লেট ডাউনলোড করুন' : '1. Download Sample CSV Template'}
                </h4>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                  {language === 'bn' 
                    ? 'সঠিক কলাম ফরম্যাট বজায় রাখতে আমাদের স্যাম্পল ফাইলটি ডাউনলোড করে আপনার পণ্যের তথ্য বসান।' 
                    : 'Download our sample CSV template to ensure correct formatting for Name, SKU, Price, Stock, Batch & Expiry Date.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'টেমপ্লেট ডাউনলোড' : 'Download Template'}</span>
            </button>
          </div>

          {/* Step 2: File Upload Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {language === 'bn' ? '২. আপনার পূরণকৃত CSV ফাইল আপলোড করুন' : '2. Upload Filled CSV File'}
            </label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-xs text-blue-600 dark:text-blue-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {fileName ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> {fileName} ({parsedRows.length} items ready)
                  </span>
                ) : (
                  language === 'bn' ? 'ফাইল সিলেক্ট করতে এখানে ক্লিক করুন অথবা ড্র্যাগ করুন' : 'Click to browse or drag and drop your CSV file here'
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">Supports .xlsx, .xls, .csv files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Preview Table if rows loaded */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {language === 'bn' ? `প্রিভিউ (${parsedRows.length} টি পণ্য পাওয়া গেছে)` : `Preview (${parsedRows.length} products detected)`}
                </h4>
                <span className="text-[11px] text-emerald-600 font-semibold">Ready to import</span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 font-mono">SKU</th>
                      <th className="py-2.5 px-3 font-mono">Category</th>
                      <th className="py-2.5 px-3 text-right font-mono">Purchase</th>
                      <th className="py-2.5 px-3 text-right font-mono">Sales</th>
                      <th className="py-2.5 px-3 text-center font-mono">Stock</th>
                      <th className="py-2.5 px-3 font-mono">Exp Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2 px-3 font-bold text-zinc-900 dark:text-white">{row.name}</td>
                        <td className="py-2 px-3 font-mono text-zinc-500">{row.sku}</td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">{row.categoryName}</td>
                        <td className="py-2 px-3 text-right font-mono">{row.purchasePrice}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{row.salesPrice}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.stock} {row.unit}</td>
                        <td className="py-2 px-3 font-mono text-rose-600 text-[11px]">{row.expDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || importing}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {importing ? (
              <span>Importing...</span>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? `${parsedRows.length} টি পণ্য ইমপোর্ট করুন` : `Import ${parsedRows.length} Products`}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
