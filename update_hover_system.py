import re

with open('src/utils/brandTheme.ts', 'r') as f:
    content = f.read()

# Add sidebarHover to the interface
if 'sidebarHover: string;' not in content:
    content = content.replace(
        "activeBg: string;",
        "activeBg: string;\n  sidebarHover: string;"
    )

# Add sidebarHover to each theme
theme_updates = [
    (r"id: 'INDIGO',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300',"),
    (r"id: 'EMERALD',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300',"),
    (r"id: 'BLUE',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300',"),
    (r"id: 'ROSE',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-300',"),
    (r"id: 'AMBER',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300',"),
    (r"id: 'TEAL',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-teal-50/80 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300',"),
    (r"id: 'VIOLET',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300',"),
    (r"id: 'SLATE',\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?,",
     "sidebarHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white',")
]

for pattern, hover_str in theme_updates:
    # Find the block and inject it if not already there
    matches = re.finditer(pattern, content)
    for match in matches:
        block = match.group(0)
        if 'sidebarHover' not in block:
            new_block = block + '\n    ' + hover_str
            content = content.replace(block, new_block)

with open('src/utils/brandTheme.ts', 'w') as f:
    f.write(content)
