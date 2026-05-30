const fs = require('fs');

let content = fs.readFileSync('src/components/Admin.js', 'utf8');

// 1. Import EventCommandCenter
if (!content.includes('EventCommandCenter')) {
    content = content.replace(
        "import OverviewDashboard from './admin/OverviewDashboard';",
        "import OverviewDashboard from './admin/OverviewDashboard';\nimport EventCommandCenter from './admin/EventCommandCenter';"
    );
}

// 2. Add state
if (!content.includes('selectedManageEvent')) {
    content = content.replace(
        "const [isAddingEvent, setIsAddingEvent] = useState(false);",
        "const [isAddingEvent, setIsAddingEvent] = useState(false);\n    const [selectedManageEvent, setSelectedManageEvent] = useState(null);"
    );
}

// 3. Render Modal
if (!content.includes('<EventCommandCenter')) {
    content = content.replace(
        "                </main>",
        "                    {selectedManageEvent && (\n                        <EventCommandCenter \n                            event={selectedManageEvent} \n                            onClose={() => setSelectedManageEvent(null)} \n                        />\n                    )}\n                </main>"
    );
}

// 4. Update the Button in the Event Card
// The previous button was:
// <button onClick={() => downloadEventParticipants(event.id, event.title)} className="px-3 py-1.5 bg-surface-highlight text-text-muted hover:text-white rounded-lg text-sm font-bold transition flex items-center gap-2" title="Download CSV"><Download className="w-4 h-4" /> Export</button>

const oldButton = '<button onClick={() => downloadEventParticipants(event.id, event.title)} className="px-3 py-1.5 bg-surface-highlight text-text-muted hover:text-white rounded-lg text-sm font-bold transition flex items-center gap-2" title="Download CSV"><Download className="w-4 h-4" /> Export</button>';
const newButton = '<button onClick={() => setSelectedManageEvent(event)} className="px-3 py-1.5 bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg text-sm font-bold transition flex items-center gap-2" title="Command Center"><Users className="w-4 h-4" /> Manage</button>';

if (content.includes(oldButton)) {
    content = content.replace(oldButton, newButton);
} else {
    // Fallback if formatting changed
    console.log("Could not find exact old button string. Attempting regex replacement...");
    const regex = /<button[^>]*downloadEventParticipants[^>]*>.*?<\/button>/s;
    if (regex.test(content)) {
        content = content.replace(regex, newButton);
    } else {
        console.log("Could not find the old export button.");
    }
}

fs.writeFileSync('src/components/Admin.js', content, 'utf8');
console.log('Admin.js integration completed.');
