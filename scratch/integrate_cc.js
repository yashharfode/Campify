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
const editButton = `                                        <button
                                            onClick={() => handleEdit(event)}
                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>`;

const newButton = `                                        <button onClick={() => setSelectedManageEvent(event)} className="px-3 py-1 bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg text-sm font-bold transition flex items-center gap-2" title="Command Center"><Users className="w-4 h-4" /> Manage</button>\n` + editButton;

if (content.includes(editButton) && !content.includes('setSelectedManageEvent(event)')) {
    content = content.replace(editButton, newButton);
} else {
    console.log("Could not find edit button or already integrated.");
}

fs.writeFileSync('src/components/Admin.js', content, 'utf8');
console.log('Admin.js integration completed.');
