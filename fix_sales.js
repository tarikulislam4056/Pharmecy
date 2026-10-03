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

  // Delete Action Confirm`;

content = content.replace('  // Delete Action Confirm', printFn);
fs.writeFileSync(file, content);
console.log('done');
