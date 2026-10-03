import fs from 'fs';
const file = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace main button font sizes
content = content.replace(/text-xs sm:text-sm font-bold/g, 'text-sm font-bold');

// Replace dropdown font size
content = content.replace(/border-t border-slate-100 dark:border-slate-800\/60 text-xs/g, 'border-t border-slate-100 dark:border-slate-800/60 text-sm');

// Also check for company name font size if needed
// content = content.replace(/text-xs sm:text-sm font-extrabold/g, 'text-sm sm:text-base font-extrabold');

fs.writeFileSync(file, content);
console.log('done');
