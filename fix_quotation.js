import fs from 'fs';
const file = 'src/components/sales/QuotationView.tsx';
let content = fs.readFileSync(file, 'utf8');

const printFn = `  const handlePrintList = () => {
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

  const handlePrintQuotation`;

content = content.replace('  const handlePrintQuotation', printFn);
fs.writeFileSync(file, content);
console.log('done');
