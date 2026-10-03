import fs from 'fs';
const file = 'src/components/purchase/PurchaseListView.tsx';
let content = fs.readFileSync(file, 'utf8');

const printFn = `
  // Generic Report Print Modal Handler
  const handlePrintReport = (reportType: 'bills' | 'category' | 'generic' | 'brand' | 'items') => {
    const activePeriodText =
      periodLabel ||
      (startDate && endDate ? \`\${startDate} to \${endDate}\` : startDate ? \`From \${startDate}\` : endDate ? \`To \${endDate}\` : 'All Time');

    if (reportType === 'bills') {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'ক্রয় ইনভয়েস তালিকা' : 'Purchase Bills Report',
        data: {
          reportTitle: language === 'bn' ? 'ক্রয় ইনভয়েস তালিকা' : 'Purchase Bills Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট ইনভয়েস' : 'Total Bills', value: filteredPurchases.length },
            { label: language === 'bn' ? 'সর্বমোট ক্রয় মূল্য' : 'Total Purchase Value', value: totalPurchaseSum },
            { label: language === 'bn' ? 'মোট পেইড' : 'Total Paid', value: totalPaidSum },
          ],
          columns: [
            { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
            { header: language === 'bn' ? 'ইনভয়েস নং' : 'Bill No', key: 'billNumber' },
            { header: language === 'bn' ? 'সাপ্লায়ার' : 'Supplier', key: 'supplierName' },
            { header: language === 'bn' ? 'মোট টাকা' : 'Total', key: 'totalAmount', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'পেইড' : 'Paid', key: 'paidAmount', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'বকেয়া' : 'Due', key: 'dueAmount', align: 'right', format: 'currency' },
          ],
          rows: filteredPurchases.map(p => ({
            date: p.date,
            billNumber: p.billNumber,
            supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown',
            totalAmount: p.totalAmount,
            paidAmount: p.paidAmount,
            dueAmount: p.totalAmount - p.paidAmount
          })),
          totals: {
            totalAmount: totalPurchaseSum,
            paidAmount: totalPaidSum,
            dueAmount: totalPurchaseSum - totalPaidSum
          }
        }
      });
    } else if (reportType === 'category') {`;

content = content.replace(`  // Generic Report Print Modal Handler
  const handlePrintReport = (reportType: 'category' | 'generic' | 'brand' | 'items') => {
    const activePeriodText =
      periodLabel ||
      (startDate && endDate ? \`\${startDate} to \${endDate}\` : startDate ? \`From \${startDate}\` : endDate ? \`To \${endDate}\` : 'All Time');

    if (reportType === 'category') {`, printFn);

content = content.replace(`{viewMode !== 'bills' && (
            <button
              type="button"
              onClick={() => handlePrintReport(viewMode as any)}`, `<button
              type="button"
              onClick={() => handlePrintReport(viewMode as any)}`);
              
content = content.replace(`              <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
            </button>
          )}`, `              <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
            </button>`);

fs.writeFileSync(file, content);
console.log('PurchaseListView done');
