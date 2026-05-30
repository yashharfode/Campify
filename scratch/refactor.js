const fs = require('fs');

let content = fs.readFileSync('src/components/Admin.js', 'utf8');

// 1. Add imports
content = content.replace(
    "import {",
    "import OverviewDashboard from './admin/OverviewDashboard';\nimport {"
);

// Add missing lucide icons to the import
content = content.replace(
    "UserPlus, Loader2, MessageSquare, Hash, Check, Image as ImageIcon, MapPin",
    "UserPlus, Loader2, MessageSquare, Hash, Check, Image as ImageIcon, MapPin, LayoutDashboard, Tent, Megaphone, User, BookOpen, List, Package, GraduationCap, UserCog, MessageCircle, Menu, Search, Bell, MenuIcon, ChevronRight"
);

// 2. Default tab 'overview'
content = content.replace(
    "const [activeTab, setActiveTab] = useState('events');",
    "const [activeTab, setActiveTab] = useState('overview');"
);

// 3. Replace layout
const startMarker = '<div className="min-h-screen bg-surface-base pb-24 px-3 md:px-6 pt-4 md:pt-6 max-w-7xl mx-auto">';
const endMarker = "            {/* Clubs Management Tab */}";

const newLayout = `        <div className="flex h-screen bg-surface-base overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-elevated border-r border-border-strong hidden md:flex flex-col">
                <div className="p-6 pb-2">
                    <h1 className="text-2xl font-black text-text-main flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-accent" />
                        Quantum
                    </h1>
                    <div className="mt-4 inline-flex items-center gap-2 bg-brand-accent/10 text-brand-accent px-3 py-1.5 rounded-full border border-brand-accent/20">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Admin Privileges</span>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {[
                        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
                        { id: 'clubs', label: 'Clubs', icon: <Tent className="w-5 h-5" /> },
                        { id: 'events', label: 'Events', icon: <Megaphone className="w-5 h-5" /> },
                        { id: 'users', label: 'Users', icon: <User className="w-5 h-5" /> },
                        { id: 'banners', label: 'Banners', icon: <ImageIcon className="w-5 h-5" /> },
                        { id: 'notes', label: 'Notes', icon: <BookOpen className="w-5 h-5" /> },
                        { id: 'notes_categories', label: 'Notes Categories', icon: <List className="w-5 h-5" /> },
                        { id: 'lostfound', label: 'Lost & Found', icon: <Package className="w-5 h-5" /> },
                        { id: 'scholarships', label: 'Scholarships', icon: <GraduationCap className="w-5 h-5" /> },
                        { id: 'admins', label: 'Admins', icon: <UserCog className="w-5 h-5" /> },
                        { id: 'chat_groups', label: 'Chat Groups', icon: <MessageCircle className="w-5 h-5" /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition \${activeTab === tab.id ? 'bg-brand-accent text-white shadow-md' : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'}\`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-surface-elevated border-b border-border-strong flex items-center justify-between px-6 z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <Search className="w-5 h-5 text-text-muted" />
                        <input type="text" placeholder="Search across platform..." className="bg-transparent border-none text-sm text-text-main focus:outline-none w-full max-w-md placeholder-text-muted" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-text-muted hover:text-text-main hover:bg-surface-highlight rounded-full transition">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-border-strong mx-2"></div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsAddingEvent(true)}
                                className="bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Create Event
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <OverviewDashboard users={users} events={events} notes={notes} />
                    )}

`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    content = before + newLayout + after;
} else {
    console.log("Could not find start or end markers for layout replacement.");
}

// 4. Close the flex layout at the very end.
const finalDiv = /        <\/div>\s*\);\s*}\s*$/;
if (finalDiv.test(content)) {
    content = content.replace(finalDiv, "                </main>\n            </div>\n        </div>\n    );\n}");
} else {
    console.log("Could not find final div closure.");
}

// 5. Download CSV export function for events
const exportFunc = `
    const downloadEventParticipants = async (eventId, eventTitle) => {
        try {
            // Check subcollection 'participants' for the event
            const participantsRef = collection(db, 'artifacts', appId, 'events', eventId, 'participants');
            const snap = await getDocs(participantsRef);
            let csv = "Name,Email,Registered At\\n";
            if (snap.empty) {
                toast.error('No participants found for this event.');
                return;
            }
            snap.forEach(doc => {
                const data = doc.data();
                const name = data.name || 'Unknown';
                const email = data.email || 'Unknown';
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                csv += \`"\${name}","\${email}","\${date}"\\n\`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${eventTitle.replace(/\\s+/g, '_')}_participants.csv\`;
            a.click();
            toast.success('Downloaded participants CSV');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export participants');
        }
    };
`;

content = content.replace(
    "const handleRevokeAdmin = async",
    exportFunc + "\n    const handleRevokeAdmin = async"
);

// Add the Download button to the event list items
const eventCardActions = `<button onClick={() => downloadEventParticipants(event.id, event.title)} className="px-3 py-1.5 bg-surface-highlight text-text-muted hover:text-white rounded-lg text-sm font-bold transition flex items-center gap-2" title="Download CSV"><Download className="w-4 h-4" /> Export</button>`;

content = content.replace(
    '<div className="flex items-center gap-2 mt-4 md:mt-0">',
    '<div className="flex items-center gap-2 mt-4 md:mt-0">\n                                        ' + eventCardActions
);

fs.writeFileSync('src/components/Admin.js', content, 'utf8');
console.log('Admin.js refactored successfully.');
