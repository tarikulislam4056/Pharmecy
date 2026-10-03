import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded text-colors for icons with sidebarTheme.iconColor
# But only for those inside className="" or className={``}
# e.g., className="w-4 h-4 text-blue-600 shrink-0" -> className={`w-4 h-4 ${sidebarTheme.iconColor} shrink-0`}
# e.g., className={`w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0`} -> className={`w-4 h-4 ${sidebarTheme.iconColor} shrink-0`}

# We'll specifically target the exact icon definitions we saw.
icon_patterns = [
    r'className="w-4 h-4 text-blue-600 shrink-0"',
    r'className="w-4 h-4 text-indigo-500 shrink-0"',
    r'className="w-4 h-4 text-sky-600 shrink-0"',
    r'className="w-4 h-4 text-amber-600 shrink-0"',
    r'className="w-4 h-4 text-emerald-600 shrink-0"',
    r'className="w-4 h-4 text-red-600 shrink-0"',
    r'className="w-4 h-4 text-indigo-600 shrink-0"',
    r'className="w-4 h-4 text-purple-600 shrink-0"',
    r'className="w-4 h-4 text-pink-600 shrink-0"',
    r'className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"',
    r'className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0"',
    r'className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0"'
]

for pattern in icon_patterns:
    content = content.replace(pattern, 'className={`w-4 h-4 ${sidebarTheme.iconColor} shrink-0`}')

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
