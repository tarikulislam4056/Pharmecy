import fs from 'fs';
const file = 'src/components/crm/DueListView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `  const handlePrintMasterDueSheet = () => {
    const reportList = currentList.map(p => ({
      ...p,
      dueAmount: p.currentBalance,
      remarks: 'Regular Ledger Balance',
    }));

    openPrintModal({
      type: 'REPORT',
      title: activeSubTab === 'customer-due' ? 'Customer Master Due List' : 'Supplier Master Due List',
      data: {
        reportType: activeSubTab === 'customer-due' ? 'CUSTOMER_DUE_LIST' : 'SUPPLIER_DUE_LIST',
        list: reportList,
        totalDue: activeSubTab === 'customer-due' ? totalCustomerReceivables : totalSupplierPayables,
      },
    });
  };`;

const newStr = `  const handlePrintMasterDueSheet = () => {
    const title = activeSubTab === 'customer-due' ? (language === 'bn' ? 'কাস্টমার বকেয়া তালিকা' : 'Customer Master Due List') : (language === 'bn' ? 'সাপ্লায়ার পাওনা তালিকা' : 'Supplier Master Due List');
    
    openPrintModal({
      type: 'REPORT',
      title: title,
      data: {
        reportTitle: title,
        period: new Date().toLocaleDateString('en-GB'),
        columns: [
          { header: language === 'bn' ? 'নাম' : 'Name', key: 'name' },
          { header: language === 'bn' ? 'ফোন' : 'Phone', key: 'phone' },
          { header: language === 'bn' ? 'বকেয়া' : 'Due Amount', key: 'dueAmount', align: 'right', format: 'currency' },
        ],
        rows: currentList.map(p => ({
          name: p.name,
          phone: p.phone,
          dueAmount: p.currentBalance
        })),
        totals: {
          dueAmount: activeSubTab === 'customer-due' ? totalCustomerReceivables : totalSupplierPayables
        }
      },
    });
  };`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content);
console.log('DueListView done');
