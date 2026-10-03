import fs from 'fs';
const file = 'src/components/sales/SalesListView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('language,', 'language,\\n    parties,');
fs.writeFileSync(file, content);
console.log('done');
