import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# Replace main tab inactive states
content = content.replace(
    "'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'",
    "`text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`"
)
content = content.replace(
    "'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'",
    "`text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`"
)

# Replace sub tab inactive states
content = content.replace(
    "'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'",
    "`text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`"
)

content = content.replace(
    "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-left transition-colors cursor-pointer",
    "text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer ${sidebarTheme.sidebarHover}"
)

# For icons inside expanded headers (like + icon wrapper)
content = content.replace(
    'className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"',
    'className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}'
)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
