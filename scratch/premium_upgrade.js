const fs = require('fs');
const path = require('path');

const targetFiles = [
    'd:/CODING Folder/Campify/campify/src/components/HomeDashboard.js',
    'd:/CODING Folder/Campify/campify/src/components/SponsoredAds.js',
    'd:/CODING Folder/Campify/campify/src/components/LostAndFound.js',
    'd:/CODING Folder/Campify/campify/src/components/Notes.js',
    'd:/CODING Folder/Campify/campify/src/components/Marketplace.js',
    'd:/CODING Folder/Campify/campify/src/components/Teams.js',
    'd:/CODING Folder/Campify/campify/src/components/Chat.js',
    'd:/CODING Folder/Campify/campify/src/components/MentorChatBubble.js'
];

function migrateComponent(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const classNameRegex = /className=(["'])(.*?)\1|className=\{`([\s\S]*?)`\}/g;

    content = content.replace(classNameRegex, (match, quote, p2, p3) => {
        let classString = p2 !== undefined ? p2 : p3;
        
        classString = classString
            .replace(/\bbg-white\b/g, 'bg-surface-elevated')
            .replace(/\bbg-gray-900\b/g, 'bg-surface-elevated')
            .replace(/\bbg-gray-[89]00\b/g, 'bg-surface-highlight')
            .replace(/\bbg-gray-[5-7]00\b/g, 'bg-border-strong')
            .replace(/\bbg-gray-[1-4]00\b/g, 'bg-surface-highlight')
            .replace(/\bbg-gray-50\b/g, 'bg-surface-base')
            
            .replace(/\btext-gray-[5-9]00\b/g, 'text-text-muted')
            .replace(/\btext-gray-[3-4]00\b/g, 'text-text-muted')
            
            .replace(/\bborder-gray-[2-8]00\b/g, 'border-border-strong')
            .replace(/\bborder-stone-[2-8]00\b/g, 'border-border-strong')
            .replace(/\bborder-stone-200\/[0-9]+\b/g, 'border-border-strong')
            
            .replace(/\btext-\[\#111827\]\b/g, 'text-white')
            .replace(/\bbg-\[\#111827\]\b/g, 'bg-surface-elevated')
            
            // Fix Scholarship muddy green
            .replace(/\bbg-green-500\/10\b/g, 'bg-green-500/20')
            .replace(/\bborder-green-500\/20\b/g, 'border-green-500/40')
            
            .replace(/\bshadow-lg\b/g, 'shadow-md')
            .replace(/\bshadow-xl\b/g, 'shadow-lg');

        if (p2 !== undefined) return `className="${classString}"`;
        return `className={\`${classString}\`}`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Migrated: ${path.basename(filePath)}`);
    } else {
        console.log(`⏭️ No changes needed: ${path.basename(filePath)}`);
    }
}

targetFiles.forEach(migrateComponent);
console.log('Premium UI Migration Complete!');
