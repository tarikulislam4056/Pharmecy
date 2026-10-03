import re

with open('src/utils/brandTheme.ts', 'r') as f:
    content = f.read()

# Indigo
content = content.replace(
    "activeBg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'",
    "activeBg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'"
)
# Emerald
content = content.replace(
    "activeBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'",
    "activeBg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'"
)
# Blue
content = content.replace(
    "activeBg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'",
    "activeBg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300'"
)
# Rose
content = content.replace(
    "activeBg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'",
    "activeBg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300'"
)
# Amber
content = content.replace(
    "activeBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'",
    "activeBg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300'"
)
# Teal
content = content.replace(
    "activeBg: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'",
    "activeBg: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300'"
)
# Violet (Purple)
content = content.replace(
    "activeBg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300'",
    "activeBg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300'"
)
# Slate
content = content.replace(
    "activeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'",
    "activeBg: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'"
)

with open('src/utils/brandTheme.ts', 'w') as f:
    f.write(content)
