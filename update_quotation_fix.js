import fs from 'fs';
const file = 'src/components/sales/QuotationView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'bn' ? 'নতুন কোটেশন' : 'New Quotation'}</span>
        </button>
      </div>`;
      
const newStr = `        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'bn' ? 'নতুন কোটেশন' : 'New Quotation'}</span>
        </button>
        </div>
      </div>`;

content = content.replace(oldStr, newStr);

fs.writeFileSync(file, content);
