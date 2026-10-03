const fs = require('fs');
const file = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace main button font sizes
content = content.replace(/text-sm font-bold/g, 'text-[15px] font-bold');

// Replace dropdown font size
content = content.replace(/border-t border-slate-100 dark:border-slate-800\/60 text-sm/g, 'border-t border-slate-100 dark:border-slate-800/60 text-[14.5px]');

fs.writeFileSync(file, content);
console.log('done');
