import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# Pattern for main tab active states: e.g., 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400'
content = re.sub(
    r"\?\s*'text-[a-z]+-600 bg-[a-z]+-50 dark:bg-[a-z]+-950/50 dark:text-[a-z]+-400'",
    r"? sidebarTheme.activeBg",
    content
)

# Pattern for submenu expanded section backgrounds: e.g., 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40'
content = re.sub(
    r"\?\s*'text-[a-z]+-600 dark:text-[a-z]+-400 bg-[a-z]+-50/70 dark:bg-[a-z]+-950/40'",
    r"? sidebarTheme.activeBg",
    content
)

# Pattern for submenu item active state: e.g. 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/30'
content = re.sub(
    r"\?\s*'text-[a-z]+-600 font-bold bg-[a-z]+-50/50 dark:bg-[a-z]+-950/30'",
    r"? `${sidebarTheme.activeBg} font-bold`",
    content
)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
