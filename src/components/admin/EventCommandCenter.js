'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Download, CheckCircle, Check, Users, ShieldAlert, Mail } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function EventCommandCenter({ event, onClose }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const participantsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events', event.id, 'registrations');
                const snap = await getDocs(participantsRef);
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by registration date descending
                data.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
                setParticipants(data);
            } catch (error) {
                console.error("Error fetching participants:", error);
                toast.error("Failed to load attendees");
            } finally {
                setLoading(false);
            }
        };

        if (event?.id) {
            fetchParticipants();
        }
    }, [event]);

    const handleCheckIn = async (participantId, currentStatus) => {
        try {
            // Optimistic update
            setParticipants(prev => prev.map(p => 
                p.id === participantId ? { ...p, checkedIn: !currentStatus } : p
            ));
            
            const participantRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', event.id, 'registrations', participantId);
            await updateDoc(participantRef, {
                checkedIn: !currentStatus
            });
            
            toast.success(!currentStatus ? 'Attendee Checked In!' : 'Check-in Revoked');
        } catch (error) {
            console.error("Error updating check-in status:", error);
            toast.error("Failed to update status");
            // Revert optimistic update
            setParticipants(prev => prev.map(p => 
                p.id === participantId ? { ...p, checkedIn: currentStatus } : p
            ));
        }
    };

    const handleExportCSV = () => {
        if (participants.length === 0) {
            toast.error("No attendees to export");
            return;
        }

        let csv = "Name,Email,Registered At,Status\n";
        participants.forEach(p => {
            const name = (p.name || 'Unknown').replace(/"/g, '""');
            const email = (p.email || 'Unknown').replace(/"/g, '""');
            const date = p.joinedAt ? new Date(p.joinedAt).toLocaleString() : 'N/A';
            const status = p.checkedIn ? 'Checked In' : 'Registered';
            csv += `"${name}","${email}","${date}","${status}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/\s+/g, '_')}_Attendees.csv`;
        a.click();
        toast.success("CSV Exported successfully");
    };

    const filteredParticipants = participants.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const checkedInCount = participants.filter(p => p.checkedIn).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface-base rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-border-strong overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="p-6 border-b border-border-strong bg-surface-elevated flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-text-main flex items-center gap-3">
                            {event.title}
                            <span className="text-xs font-bold bg-brand-accent/20 text-brand-accent px-3 py-1 rounded-full border border-brand-accent/30 uppercase tracking-wider">
                                Command Center
                            </span>
                        </h2>
                        <p className="text-sm text-text-muted mt-1">{event.date} • {event.location}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-surface-highlight flex items-center justify-center text-text-muted hover:text-text-main hover:bg-border-strong transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-strong border-b border-border-strong bg-surface-base shrink-0">
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">Total Registered</p>
                            <p className="text-2xl font-black text-text-main">{participants.length}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">Checked In</p>
                            <p className="text-2xl font-black text-text-main">{checkedInCount}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">Attendance Rate</p>
                            <p className="text-2xl font-black text-text-main">
                                {participants.length > 0 ? Math.round((checkedInCount / participants.length) * 100) : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-surface-elevated border-b border-border-strong flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                            type="text"
                            placeholder="Search attendees by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-base border border-border-strong rounded-xl text-sm focus:outline-none focus:border-brand-accent text-text-main placeholder-text-muted transition"
                        />
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="w-full sm:w-auto px-5 py-2.5 bg-surface-highlight hover:bg-border-strong text-text-main rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted">
                            <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading attendees...</p>
                        </div>
                    ) : filteredParticipants.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted">
                            <Users className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-bold text-lg text-text-main mb-1">No attendees found</p>
                            <p className="text-sm">Try adjusting your search or wait for registrations.</p>
                        </div>
                    ) : (
                        <div className="border border-border-strong rounded-xl overflow-hidden bg-surface-base">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-surface-elevated">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-strong">Attendee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-strong">Contact</th>
                                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-strong">Registered</th>
                                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-strong text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-strong">
                                    {filteredParticipants.map((p) => (
                                        <tr key={p.id} className="hover:bg-surface-highlight/50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-sm">
                                                        {(p.name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-text-main">{p.name || 'Unknown User'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-text-muted text-sm">
                                                    <Mail className="w-4 h-4" />
                                                    {p.email || 'No email provided'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-muted">
                                                {p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleCheckIn(p.id, p.checkedIn)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
                                                        p.checkedIn 
                                                            ? 'bg-brand-accent/20 text-brand-accent hover:bg-red-500/20 hover:text-red-500' 
                                                            : 'bg-surface-highlight text-text-muted hover:bg-brand-accent hover:text-white'
                                                    }`}
                                                >
                                                    {p.checkedIn ? (
                                                        <>
                                                            <Check className="w-4 h-4" /> Checked In
                                                        </>
                                                    ) : (
                                                        'Check In'
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
