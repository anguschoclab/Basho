const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// Move the @import to the very top
content = content.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Noto\+Serif\+JP:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap'\);\n\n/, '');

content = `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');\n` + content;

fs.writeFileSync('src/index.css', content);
