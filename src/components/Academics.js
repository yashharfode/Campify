'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { GraduationCap, Book, FileText, Search, Loader2, Filter, ExternalLink, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Academics() {
    const [activeTab, setActiveTab] = useState('timetable'); // 'timetable' or 'syllabus'
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
    const BRANCHES = [
        'All',
        'Computer Science (CSE)',
        'Information Technology (IT)',
        'Electronics (ECE)',
        'Electrical (EE)',
        'Mechanical (ME)',
        'Civil (CE)',
        'First Year (Common)'
    ];

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const ref = collection(db, 'artifacts', appId, 'public', 'data', 'academics');
            const q = query(ref);
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResources(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching academic resources:', error);
            toast.error('Failed to load academic resources');
            setLoading(false);
        }
    };

    const filteredResources = resources.filter(item => {
        if (item.type !== activeTab) return false;
        if (selectedBranch !== 'All' && item.branch !== selectedBranch) return false;
        if (selectedSemester !== 'All' && item.semester !== selectedSemester) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return item.title.toLowerCase().includes(query) || 
                   (item.description && item.description.toLowerCase().includes(query));
        }
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-surface-base">
            {/* Header & Tabs */}
            <div className="bg-surface-elevated border-b border-border-strong sticky top-0 z-20">
                <div className="px-6 md:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                                <GraduationCap className="w-8 h-8 text-brand-accent" />
                                Academics
                            </h1>
                            <p className="text-text-muted mt-2">Official time tables and syllabi for your semester.</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-72">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-highlight border border-border-strong rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={() => setActiveTab('timetable')}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'timetable'
                                    ? 'bg-brand-accent text-white shadow-md'
                                    : 'bg-surface-highlight text-text-muted hover:text-text-main border border-border-strong'
                            }`}
                        >
                            <CalendarDays className="w-4 h-4" /> Time Tables
                        </button>
                        <button
                            onClick={() => setActiveTab('syllabus')}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'syllabus'
                                    ? 'bg-brand-accent text-white shadow-md'
                                    : 'bg-surface-highlight text-text-muted hover:text-text-main border border-border-strong'
                            }`}
                        >
                            <Book className="w-4 h-4" /> Syllabus
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="px-6 md:px-8 py-3 bg-surface-highlight border-t border-border-strong flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 text-text-muted text-sm font-bold">
                        <Filter className="w-4 h-4" /> Filters:
                    </div>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-surface-elevated border border-border-strong rounded-xl px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none cursor-pointer shadow-sm"
                    >
                        {BRANCHES.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
                    </select>
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="bg-surface-elevated border border-border-strong rounded-xl px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none cursor-pointer shadow-sm"
                    >
                        {SEMESTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : s}</option>)}
                    </select>
                </div>
            </div>

            {/* Content Feed */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 custom-scrollbar relative z-10">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
                        </div>
                    ) : filteredResources.length === 0 ? (
                        <div className="text-center py-24 bg-surface-elevated rounded-[32px] border border-dashed border-border-strong shadow-sm max-w-2xl mx-auto">
                            <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                {activeTab === 'timetable' ? <CalendarDays className="w-10 h-10 text-text-muted" /> : <Book className="w-10 h-10 text-text-muted" />}
                            </div>
                            <h3 className="text-xl font-bold text-text-main mb-2">No {activeTab === 'timetable' ? 'Time Tables' : 'Syllabi'} Found</h3>
                            <p className="text-text-muted mb-6">There are no resources available for the selected filters.</p>
                            <button 
                                onClick={() => { setSelectedBranch('All'); setSelectedSemester('All'); setSearchQuery(''); }}
                                className="px-6 py-2.5 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 rounded-xl font-bold transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredResources.map((item, index) => (
                                <div 
                                    key={item.id} 
                                    className="bg-surface-elevated rounded-3xl p-6 border border-border-strong hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col group animate-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${activeTab === 'timetable' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                            {activeTab === 'timetable' ? <CalendarDays className="w-6 h-6" /> : <Book className="w-6 h-6" />}
                                        </div>
                                        <span className="text-xs font-bold text-text-muted bg-surface-highlight px-3 py-1 rounded-full border border-border-strong">
                                            {item.semester}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-text-main mb-2 leading-tight group-hover:text-brand-accent transition-colors">
                                        {item.title}
                                    </h3>
                                    
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-text-muted tracking-wide uppercase">Branch</span>
                                        <p className="text-sm font-medium text-text-main mt-0.5">{item.branch}</p>
                                    </div>

                                    {item.description && (
                                        <p className="text-sm text-text-muted line-clamp-2 mb-6 flex-1">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-border-strong">
                                        <a 
                                            href={item.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-accent text-white rounded-xl text-sm font-bold hover:bg-brand-accent-hover shadow-sm hover:shadow-md transition-all group-hover:-translate-y-0.5"
                                        >
                                            <ExternalLink className="w-4 h-4" /> 
                                            View {activeTab === 'timetable' ? 'Time Table' : 'Syllabus'}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--border-strong);
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: var(--ink-soft);
                }
            `}</style>
        </div>
    );
}
