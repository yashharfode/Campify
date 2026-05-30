'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Upload, FileText, Download, Clock, CheckCircle, XCircle,
    Filter, Search, BookOpen, GraduationCap, X, Loader2, AlertCircle, Link as LinkIcon, ImageIcon, ChevronDown, Menu
} from 'lucide-react';
import { collection, addDoc, getDocs, query, where, serverTimestamp, getDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import toast from 'react-hot-toast';
import { uploadToCloudinary, getOptimizedImageUrl } from '../lib/cloudinary';
import { checkCooldown, awardKarma } from '../lib/karma';

export default function Notes({ user, userData }) {
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'my-notes', 'upload'
    const [notes, setNotes] = useState([]);
    const [myNotes, setMyNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Categories State
    const [categories, setCategories] = useState({});
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterSem, setFilterSem] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterUnit, setFilterUnit] = useState('All');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        branch: '',
        semester: '',
        subject: '',
        unit: 'All Units',
        driveLink: '',
        coverImage: ''
    });
    const coverImageInputRef = useRef(null);

    const UNITS = ['All Units', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'];

    const sortByCreatedDesc = (items) => [...items].sort((a, b) => {
        const aSeconds = a?.createdAt?.seconds || 0;
        const bSeconds = b?.createdAt?.seconds || 0;
        return bSeconds - aSeconds;
    });

    useEffect(() => {
        fetchCategories();
        fetchApprovedNotes();
        if (user) {
            fetchMyNotes();
        }
    }, [user]);

    const fetchCategories = async () => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'metadata_notes_categories');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const cats = docSnap.data().categories || {};
                setCategories(cats);
                // Set default form data if available
                const firstBranch = Object.keys(cats)[0];
                if (firstBranch) {
                    const firstSem = Object.keys(cats[firstBranch])[0];
                    const firstSub = cats[firstBranch][firstSem]?.[0] || '';
                    setFormData(prev => ({
                        ...prev,
                        branch: firstBranch,
                        semester: firstSem,
                        subject: firstSub
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const fetchApprovedNotes = async () => {
        try {
            const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
            const q = query(notesRef, where('status', '==', 'approved'));
            const snapshot = await getDocs(q);
            const fetchedNotes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotes(sortByCreatedDesc(fetchedNotes));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching notes:', error);
            toast.error('Failed to load notes');
            setLoading(false);
        }
    };

    const fetchMyNotes = async () => {
        try {
            const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
            const q = query(notesRef, where('uploadedBy', '==', user.uid));
            const snapshot = await getDocs(q);
            const fetchedNotes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMyNotes(sortByCreatedDesc(fetchedNotes));
        } catch (error) {
            console.error('Error fetching my notes:', error);
        }
    };

    const handleCoverImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2097152) { // 2MB
                toast.error('Cover image too large! Max 2MB');
                return;
            }
            try {
                toast.loading('Uploading cover image...', { id: 'noteCover' });
                const url = await uploadToCloudinary(file);
                setFormData(prev => ({ ...prev, coverImage: url }));
                toast.success('Cover image added!', { id: 'noteCover' });
            } catch (err) {
                toast.error('Failed to upload cover', { id: 'noteCover' });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!checkCooldown(userData, 'notes')) return;
        
        if (!user) return toast.error('You must be logged in to upload notes');
        
        if (!formData.driveLink || !formData.subject) {
            toast.error('Please fill all required fields');
            return;
        }

        setUploading(true);
        try {
            const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
            await addDoc(notesRef, {
                title: formData.title,
                description: formData.description,
                branch: formData.branch,
                semester: formData.semester,
                subject: formData.subject,
                unit: formData.unit,
                driveLink: formData.driveLink,
                coverImage: formData.coverImage || '',
                uploadedBy: user.uid,
                uploadedByName: userData?.name || 'Unknown User',
                status: 'pending',
                createdAt: serverTimestamp()
            });

            toast.success('Note uploaded successfully! Waiting for admin approval.');
            
            await awardKarma(user, 10, `Uploaded Note: ${formData.title}`, 'notes');
            
            // Reset form but keep last selected categories
            setFormData(prev => ({
                ...prev,
                title: '',
                description: '',
                driveLink: '',
                coverImage: '',
                unit: 'All Units'
            }));
            if (coverImageInputRef.current) coverImageInputRef.current.value = '';
            
            fetchMyNotes();
            setActiveTab('my-notes');
        } catch (error) {
            console.error('Error uploading note:', error);
            toast.error('Failed to upload note');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = (note) => {
        try {
            if (note.driveLink) {
                window.open(note.driveLink, '_blank');
                toast.success('Opening Drive link!');
            } else {
                toast.error('No Drive link found');
            }
        } catch (error) {
            console.error('Error opening link:', error);
            toast.error('Failed to open link');
        }
    };

    // Filter Logic
    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              note.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = filterBranch === 'All' || note.branch === filterBranch;
        const matchesSem = filterSem === 'All' || note.semester === filterSem;
        const matchesSubject = filterSubject === 'All' || note.subject === filterSubject;
        const matchesUnit = filterUnit === 'All' || note.unit === filterUnit;
        
        return matchesSearch && matchesBranch && matchesSem && matchesSubject && matchesUnit;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    <CheckCircle className="w-3 h-3" /> Approved
                </span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    <XCircle className="w-3 h-3" /> Rejected
                </span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                    <Clock className="w-3 h-3" /> Pending
                </span>;
        }
    };

    // Handle cascading form dropdowns
    const handleFormBranchChange = (e) => {
        const newBranch = e.target.value;
        const newSems = Object.keys(categories[newBranch] || {});
        const newSem = newSems[0] || '';
        const newSubs = categories[newBranch]?.[newSem] || [];
        const newSub = newSubs[0] || '';
        
        setFormData({
            ...formData,
            branch: newBranch,
            semester: newSem,
            subject: newSub
        });
    };

    const handleFormSemChange = (e) => {
        const newSem = e.target.value;
        const newSubs = categories[formData.branch]?.[newSem] || [];
        const newSub = newSubs[0] || '';
        
        setFormData({
            ...formData,
            semester: newSem,
            subject: newSub
        });
    };

    // Handle cascading filter dropdowns
    const handleFilterBranchChange = (e) => {
        setFilterBranch(e.target.value);
        setFilterSem('All');
        setFilterSubject('All');
    };

    const handleFilterSemChange = (e) => {
        setFilterSem(e.target.value);
        setFilterSubject('All');
    };

    const availableFilterSems = filterBranch === 'All' ? [] : Object.keys(categories[filterBranch] || {});
    const availableFilterSubjects = filterSem === 'All' ? [] : (categories[filterBranch]?.[filterSem] || []);

    return (
        <div className="min-h-screen bg-background pb-24 pt-4 px-3 md:px-4 max-w-[2560px] mx-auto 2xl:px-12">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-text-main flex items-center gap-3 mb-2">
                    <GraduationCap className="w-7 h-7 md:w-8 md:h-8 text-[#0f4c52]" />
                    Study Notes
                </h1>
                <p className="text-[#6b6f74] text-sm md:text-base">Share and access study materials from your peers</p>
            </div>
            
            {/* Tabs */}
            <div className="bg-surface-base/90 rounded-xl border border-border-strong p-1 mb-6 flex gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`min-w-[120px] flex-1 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
                        activeTab === 'all' ? 'bg-brand-accent text-[#111827]' : 'text-text-muted hover:bg-surface-2'
                    }`}
                >
                    <BookOpen className="w-4 h-4" /> All Notes
                </button>
                <button
                    onClick={() => setActiveTab('my-notes')}
                    className={`min-w-[120px] flex-1 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
                        activeTab === 'my-notes' ? 'bg-brand-accent text-[#111827]' : 'text-text-muted hover:bg-surface-2'
                    }`}
                >
                    <FileText className="w-4 h-4" /> My Notes
                </button>
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`min-w-[132px] flex-1 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
                        activeTab === 'upload' ? 'bg-brand-accent text-[#111827]' : 'text-text-muted hover:bg-surface-2'
                    }`}
                >
                    <Upload className="w-4 h-4" /> Upload Note
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'all' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Mobile Sidebar Toggle */}
                    <button 
                        className="lg:hidden w-full bg-surface-base border border-border-strong text-text-main p-3 rounded-xl font-bold flex justify-between items-center shadow-sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <span className="flex items-center gap-2"><Filter className="w-5 h-5"/> Filter Notes</span>
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {/* Sidebar / Filters */}
                    <div className={`lg:w-64 flex-shrink-0 space-y-4 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-surface-base border border-border-strong rounded-xl p-5 sticky top-24 shadow-sm">
                            <div className="mb-6 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border-strong text-text-main rounded-lg focus:ring-2 focus:ring-[#C08457] focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Branch</label>
                                    <select
                                        value={filterBranch}
                                        onChange={handleFilterBranchChange}
                                        className="w-full bg-surface-elevated border border-border-strong text-text-main rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                    >
                                        <option value="All">All Branches</option>
                                        {Object.keys(categories).map(branch => (
                                            <option key={branch} value={branch}>{branch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Semester</label>
                                    <select
                                        value={filterSem}
                                        onChange={handleFilterSemChange}
                                        disabled={filterBranch === 'All'}
                                        className="w-full bg-surface-elevated border border-border-strong text-text-main rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457] disabled:opacity-50"
                                    >
                                        <option value="All">All Semesters</option>
                                        {availableFilterSems.map(sem => (
                                            <option key={sem} value={sem}>{sem}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Subject</label>
                                    <select
                                        value={filterSubject}
                                        onChange={(e) => setFilterSubject(e.target.value)}
                                        disabled={filterSem === 'All'}
                                        className="w-full bg-surface-elevated border border-border-strong text-text-main rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457] disabled:opacity-50"
                                    >
                                        <option value="All">All Subjects</option>
                                        {availableFilterSubjects.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Unit</label>
                                    <select
                                        value={filterUnit}
                                        onChange={(e) => setFilterUnit(e.target.value)}
                                        className="w-full bg-surface-elevated border border-border-strong text-text-main rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                    >
                                        {UNITS.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 bg-surface-base border border-border-strong rounded-xl shadow-sm">
                                <Loader2 className="w-10 h-10 animate-spin text-[#0f4c52] mb-4" />
                                <p className="text-text-muted font-bold tracking-wide">Loading notes...</p>
                            </div>
                        ) : filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 bg-surface-base border border-border-strong rounded-xl shadow-sm">
                                <FileText className="w-16 h-16 text-text-muted mb-4" />
                                <p className="text-text-muted font-bold text-lg">No notes found</p>
                                <p className="text-text-muted text-sm">Try adjusting your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                                {filteredNotes.map(note => (
                                    <div key={note.id} className="bg-surface-base rounded-xl border border-border-strong overflow-hidden hover:shadow-md transition group flex flex-col h-full">
                                        {/* Cover Image */}
                                        <div className="h-32 bg-surface-elevated overflow-hidden relative border-b border-border-strong aspect-video w-full">
                                            {note.coverImage ? (
                                                <img src={getOptimizedImageUrl(note.coverImage, '16:9')} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={note.title} />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F3F0EA]">
                                                    <BookOpen className="w-12 h-12 text-text-muted" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                                <span className="bg-brand-accent text-[#111827] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                                    {note.semester}
                                                </span>
                                                {note.unit !== 'All Units' && (
                                                    <span className="bg-[#2f2f2f] text-[#111827] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                                        {note.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="mb-2">
                                                <span className="text-[10px] font-black text-[#0f4c52] uppercase tracking-wider mb-1 block">
                                                    {note.branch}
                                                </span>
                                                <h3 className="font-bold text-text-main text-base leading-tight mb-1 line-clamp-2">{note.title}</h3>
                                                <p className="text-text-muted text-xs font-semibold">{note.subject}</p>
                                            </div>
                                            
                                            <p className="text-sm text-text-muted mb-4 line-clamp-2 flex-1">{note.description || 'No description provided.'}</p>
                                            
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-strong">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-text-muted font-medium truncate max-w-[100px]">By {note.uploadedByName}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(note)}
                                                    className="bg-brand-accent hover:bg-brand-accent-hover text-[#111827] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" /> Open
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* My Notes Tab */}
            {activeTab === 'my-notes' && (
                <div>
                    {myNotes.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-12 bg-surface-base border border-border-strong rounded-xl shadow-sm">
                             <FileText className="w-16 h-16 text-text-muted mb-4" />
                             <p className="text-text-muted font-bold text-lg mb-4">You haven't uploaded any notes yet.</p>
                             <button
                                 onClick={() => setActiveTab('upload')}
                                 className="bg-brand-accent text-[#111827] px-6 py-2.5 rounded-lg font-bold hover:bg-brand-accent-hover transition shadow-md"
                             >
                                 Upload Your First Note
                             </button>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {myNotes.map(note => (
                                <div key={note.id} className="bg-surface-base rounded-xl border border-border-strong overflow-hidden hover:shadow-md transition flex flex-col shadow-sm">
                                    {/* Cover Image */}
                                    <div className="h-28 bg-surface-elevated overflow-hidden relative border-b border-border-strong aspect-video w-full">
                                        {note.coverImage ? (
                                            <img src={getOptimizedImageUrl(note.coverImage, '16:9')} className="w-full h-full object-cover" alt={note.title} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F3F0EA]">
                                                <BookOpen className="w-10 h-10 text-text-muted" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(note.status)}
                                        </div>
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <div className="mb-3">
                                            <span className="text-[10px] font-black text-[#0f4c52] uppercase tracking-wider mb-1 block">
                                                {note.semester} • {note.unit}
                                            </span>
                                            <h3 className="font-bold text-text-main text-sm leading-tight mb-1 line-clamp-1">{note.title}</h3>
                                            <p className="text-text-muted text-xs font-medium line-clamp-1">{note.subject}</p>
                                        </div>
                                        
                                        {note.status === 'approved' && (
                                            <button
                                                onClick={() => handleDownload(note)}
                                                className="mt-auto w-full bg-surface-elevated hover:bg-surface-highlight text-text-muted px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-border-strong"
                                            >
                                                <LinkIcon className="w-3.5 h-3.5" /> Open Drive Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="bg-surface-base rounded-2xl border border-border-strong p-6 md:p-8 max-w-2xl mx-auto shadow-md">
                    <h2 className="text-2xl font-bold text-text-main mb-2">Upload Study Note</h2>
                    <p className="text-text-muted text-sm mb-8">Share your materials. All uploads are reviewed before publishing.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-2">Title *</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent transition"
                                placeholder="e.g., Calculus Formula Sheet"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent transition resize-none"
                                placeholder="Briefly describe what this contains..."
                            />
                        </div>

                        {/* Hierarchical Selection */}
                        <div className="bg-surface-elevated p-5 rounded-xl border border-border-strong space-y-4">
                            <h3 className="text-sm font-bold text-text-main flex items-center gap-2 mb-2">
                                <GraduationCap className="w-4 h-4 text-[#0f4c52]" /> Categorization
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Branch *</label>
                                    <select
                                        required
                                        value={formData.branch}
                                        onChange={handleFormBranchChange}
                                        className="w-full border border-border-strong rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                    >
                                        {Object.keys(categories).map(branch => (
                                            <option key={branch} value={branch}>{branch}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Semester *</label>
                                    <select
                                        required
                                        value={formData.semester}
                                        onChange={handleFormSemChange}
                                        className="w-full border border-border-strong rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                    >
                                        {Object.keys(categories[formData.branch] || {}).map(sem => (
                                            <option key={sem} value={sem}>{sem}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">Subject *</label>
                                        <select
                                            required
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full border border-border-strong rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                        >
                                            {(categories[formData.branch]?.[formData.semester] || []).map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">Unit</label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full border border-border-strong rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#C08457]"
                                        >
                                            {UNITS.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-2">Google Drive Link *</label>
                            <input
                                required
                                type="url"
                                value={formData.driveLink}
                                onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent transition"
                                placeholder="https://drive.google.com/file/d/..."
                            />
                            <p className="text-xs text-text-muted mt-1.5 font-medium">Make sure the link has viewing permissions for everyone</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-2">Cover Image (Optional)</label>
                            <div
                                onClick={() => coverImageInputRef.current?.click()}
                                className="border-2 border-dashed border-border-strong rounded-xl p-8 text-center cursor-pointer hover:border-[#C08457] hover:bg-surface-elevated transition group"
                            >
                                {formData.coverImage ? (
                                    <div className="space-y-3">
                                        <img src={getOptimizedImageUrl(formData.coverImage, '16:9')} className="w-full h-40 object-cover rounded-lg mx-auto border border-border-strong" alt="Cover preview" />
                                        <p className="text-xs text-green-600 font-bold">✓ Cover image attached</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                            <ImageIcon className="w-6 h-6 text-text-muted" />
                                        </div>
                                        <p className="text-sm font-bold text-text-muted">Click to upload preview image</p>
                                        <p className="text-xs text-text-muted mt-1">16:9 ratio recommended (Max 500KB)</p>
                                    </div>
                                )}
                                <input
                                    ref={coverImageInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleCoverImageUpload}
                                />
                            </div>
                        </div>

                        <div className="bg-surface-highlight border border-[#333] rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-900">
                                    <p className="font-bold mb-1">Note:</p>
                                    <p>Your note will be reviewed by an admin before being published. This usually takes 24-48 hours.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploading || categoriesLoading || !formData.subject}
                            className="w-full bg-brand-accent hover:bg-brand-accent-hover text-[#111827] px-6 py-4 rounded-xl font-bold transition disabled:bg-surface-highlight disabled:text-text-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 text-base shadow-md hover:shadow-md"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Uploading Note...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Submit Note
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}


