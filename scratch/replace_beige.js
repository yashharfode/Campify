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
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content
                .replace(/#141619/gi, '#FAF7F2') // Background -> Beige
                .replace(/bg-\[#2C2E3A\]/gi, 'bg-[#FFFFFF]') // bg-surface -> bg-white
                .replace(/border-\[#2C2E3A\]/gi, 'border-[#E7E5E4]') // borders
                .replace(/from-\[#2C2E3A\]/gi, 'from-[#FFFFFF]')
                .replace(/to-\[#2C2E3A\]/gi, 'to-[#FFFFFF]')
                .replace(/text-white/g, 'text-[#111827]') // Light mode text
                .replace(/text-\[#B3B4BD\]/gi, 'text-[#6B7280]') // Muted text
                .replace(/bg-\[#050A44\]/gi, 'bg-[#F3F0EA]') // Surface 2 / highlight
                .replace(/border-\[#050A44\]/gi, 'border-[#E7E5E4]')
                .replace(/from-\[#050A44\]/gi, 'from-[#F3F0EA]')
                .replace(/to-\[#050A44\]/gi, 'to-[#F3F0EA]')
                .replace(/#0A21C0/gi, '#C08457') // Brand accent -> Orange
                .replace(/#050A44/gi, '#A6724A') // Brand hover -> Darker Orange
                
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Updated ' + fullPath);
            }
        }
    }
}
replaceInFiles('./src');
