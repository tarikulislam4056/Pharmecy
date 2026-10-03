import fs from 'fs';
const file = 'src/components/sales/SalesListView.tsx';
let content = fs.readFileSync(file, 'utf8');

const printFn = `
  const handlePrintList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'বিক্রয় তালিকা' : 'SALES LIST',
      data: {
        reportTitle: language === 'bn' ? 'বিক্রয় তালিকা' : 'SALES LIST',
        period: periodLabel || 'All Time',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Invoice No', key: 'invoiceNo' },
          { header: 'Customer', key: 'customer' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' },
          { header: 'Paid', key: 'paid', align: 'right', format: 'currency' },
          { header: 'Due', key: 'due', align: 'right', format: 'currency' },
        ],
        rows: filteredInvoices.map(inv => ({
          date: inv.date,
          invoiceNo: inv.id,
          customer: parties.find(p => p.id === inv.customerId)?.name || 'Walk-in Customer',
          total: inv.grandTotal,
          paid: inv.paidAmount,
          due: inv.grandTotal - inv.paidAmount,
        })),
        totals: {
          total: totalSalesSum,
          paid: totalPaidSum,
          due: totalDueSum,
        }
      }
    });
  };

  // Delete Invoice Handler`;

content = content.replace('  // Delete Invoice Handler', printFn);

const printBtn = `<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintList}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'bn' ? 'লিস্ট প্রিন্ট' : 'Print List'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pos')}`;

content = content.replace(`<div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}`, printBtn);

fs.writeFileSync(file, content);
console.log('SalesListView done');
