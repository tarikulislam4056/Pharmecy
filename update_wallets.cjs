const fs = require('fs');
const file = 'src/components/finance/WalletsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWalletToDelete(wallet)}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>`;

const replacement = `                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {currentUser?.role === 'ADMIN' && (
                                  <button
                                    type="button"
                                    onClick={() => setWalletToDelete(wallet)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}`;

content = content.replaceAll(target, replacement);
fs.writeFileSync(file, content);
console.log('done');
