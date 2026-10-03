import re

with open('src/utils/sqlExporter.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "`dashboardColorTheme` varchar(50) DEFAULT 'INDIGO',",
    "`dashboardColorTheme` varchar(50) DEFAULT 'INDIGO',\n  `sidebarColorTheme` varchar(50) DEFAULT 'INDIGO',"
)

content = content.replace(
    "`invoiceCustomAccentColor`, `dashboardColorTheme`, `smsSenderId`",
    "`invoiceCustomAccentColor`, `dashboardColorTheme`, `sidebarColorTheme`, `smsSenderId`"
)

content = content.replace(
    "${sqlEscape(cs.dashboardColorTheme || 'INDIGO')},\\n`;",
    "${sqlEscape(cs.dashboardColorTheme || 'INDIGO')},\\n` +\n    `  ${sqlEscape(cs.sidebarColorTheme || 'INDIGO')},\\n`;"
)

with open('src/utils/sqlExporter.ts', 'w') as f:
    f.write(content)
