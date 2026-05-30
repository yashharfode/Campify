const fs = require('fs');

const filePath = 'd:\\CODING Folder\\Campify\\campify\\src\\components\\Chat.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/border-\[\#333\]/g, 'border-border-strong');
content = content.replace(/bg-\[\#333\]/g, 'bg-border-strong');
content = content.replace(/text-\[\#E0E0E0\]/g, 'text-text-main');
content = content.replace(/text-\[\#888\]/g, 'text-text-muted');
content = content.replace(/text-\[\#666\]/g, 'text-text-muted');
content = content.replace(/text-\[\#6B7280\]/g, 'text-text-muted');
content = content.replace(/text-\[\#bbb\]/g, 'text-text-muted');
content = content.replace(/placeholder-\[\#666\]/g, 'placeholder:text-text-muted');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Chat.js colors');
