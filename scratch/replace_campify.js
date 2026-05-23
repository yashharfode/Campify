const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
                replaceInFiles(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content
                .replace(/#2D5A27/gi, '#0A21C0') // Brand accent (Green to Blue)
                .replace(/#397032/gi, '#050A44') // Brand hover
                .replace(/#121212/gi, '#141619') // Background
                .replace(/#1A1A1A/gi, '#2C2E3A') // Surface elevated
                .replace(/#242424/gi, '#050A44') // Surface highlight
                .replace(/#1F2937/gi, '#2C2E3A') // Border strong
                .replace(/#333333/gi, '#2C2E3A') // Line soft / subtle border
                .replace(/#A0A0A0/gi, '#B3B4BD') // text muted
                .replace(/#9CA3AF/gi, '#B3B4BD') // text muted 2
                .replace(/#1b3834/gi, '#0A21C0') // glow primary
                .replace(/#142a27/gi, '#050A44'); // glow secondary
                
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Updated ' + fullPath);
            }
        }
    }
}
replaceInFiles('./src');
