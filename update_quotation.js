import fs from 'fs';
const file = 'src/components/sales/QuotationView.tsx';
let content = fs.readFileSync(file, 'utf8');

const printFn = `
  const handlePrintList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'কোটেশন তালিকা' : 'PRICE QUOTATION LIST',
      data: {
        reportTitle: language === 'bn' ? 'কোটেশন তালিকা' : 'PRICE QUOTATION LIST',
        period: 'All Time',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Quote No', key: 'quoteNo' },
          { header: 'Customer', key: 'customer' },
          { header: 'Status', key: 'status', align: 'center' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' }
        ],
        rows: filteredQuotations.map(q => ({
          date: q.date,
          quoteNo: q.id,
          customer: q.customerName,
          status: q.status,
          total: q.grandTotal
        })),
        totals: {
          total: filteredQuotations.reduce((acc, q) => acc + q.grandTotal, 0)
        }
      }
    });
  };

  // Status Badge Helper`;

content = content.replace('  // Status Badge Helper', printFn);

const printBtn = `<div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handlePrintList}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
        >
          <Printer className="w-5 h-5" />
          <span>{language === 'bn' ? 'লিস্ট প্রিন্ট' : 'Print List'}</span>
        </button>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}`;

content = content.replace(`<button
          onClick={() => { resetForm(); setIsModalOpen(true); }}`, printBtn);

if (!content.includes('Printer')) {
  content = content.replace('X,', 'X, Printer,');
}

fs.writeFileSync(file, content);
console.log('QuotationView done');
