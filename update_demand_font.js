import fs from 'fs';
const file = 'src/components/dashboard/DemandForecastWidget.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace responsive classes first to avoid double replacement
content = content.replace(/text-lg sm:text-xl md:text-2xl/g, 'text-xl sm:text-2xl md:text-3xl');
content = content.replace(/text-xs sm:text-sm/g, 'text-sm sm:text-base');

// Replace static classes
content = content.replace(/text-2xl/g, 'text-3xl');
content = content.replace(/text-xl/g, 'text-2xl');
content = content.replace(/text-lg/g, 'text-xl');
content = content.replace(/text-base/g, 'text-lg');

// Use regex with boundaries.
content = content.replace(/(?<=[\s"'\`])text-sm(?=[\s"'\`])/g, 'text-base');
content = content.replace(/(?<=[\s"'\`])text-xs(?=[\s"'\`])/g, 'text-sm');

// Also update very small text sizes
content = content.replace(/(?<=[\s"'\`])text-\[10px\](?=[\s"'\`])/g, 'text-xs');
content = content.replace(/(?<=[\s"'\`])text-\[11px\](?=[\s"'\`])/g, 'text-sm');

fs.writeFileSync(file, content);
console.log('done');
