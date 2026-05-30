'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { Plus, Trash2, Edit2, Loader2, Book, FileText, ExternalLink, GraduationCap, X, Save, Image as ImageIcon } from 'lucide-react';

export default function AcademicsManager({ user }) {
    const [academicItems, setAcademicItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        type: 'timetable', // 'timetable' or 'syllabus'
        branch: '',
        semester: '',
        title: '',
        documentUrl: '', // Can be a drive link or cloudinary image
        description: ''
    });

    const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
    const BRANCHES = [
        'Computer Science (CSE)',
        'Information Technology (IT)',
        'Electronics (ECE)',
        'Electrical (EE)',
        'Mechanical (ME)',
        'Civil (CE)',
        'First Year (Common)'
    ];

    useEffect(() => {
        fetchAcademicItems();
    }, []);

    const fetchAcademicItems = async () => {
        try {
            const ref = collection(db, 'artifacts', appId, 'public', 'data', 'academics');
            const snapshot = await getDocs(ref);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAcademicItems(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching academic items:', error);
            toast.error('Failed to load academics data');
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ensure it's an image or pdf
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            toast.error('Please upload an image or PDF file');
            return;
        }

        if (file.size > 5242880) { // 5MB limit
            toast.error('File size should be less than 5MB');
            return;
        }

        try {
            setIsUploading(true);
            toast.loading('Uploading document...', { id: 'academicsUpload' });
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, documentUrl: url }));
            toast.success('Document uploaded successfully!', { id: 'academicsUpload' });
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload document', { id: 'academicsUpload' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.branch || !formData.semester || !formData.title || !formData.documentUrl) {
            toast.error('Please fill all required fields including document link/upload');
            return;
        }

        try {
            const ref = collection(db, 'artifacts', appId, 'public', 'data', 'academics');
            
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (editingItem) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academics', editingItem.id), dataToSave);
                toast.success('Academic resource updated!');
            } else {
                dataToSave.createdAt = serverTimestamp();
                dataToSave.createdBy = user?.uid || 'Admin';
                await addDoc(ref, dataToSave);
                toast.success('Academic resource added!');
            }

            handleCancel();
            fetchAcademicItems();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save academic resource');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            type: item.type || 'timetable',
            branch: item.branch || '',
            semester: item.semester || '',
            title: item.title || '',
            documentUrl: item.documentUrl || '',
            description: item.description || ''
        });
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'academics', id));
            toast.success('Resource deleted successfully');
            fetchAcademicItems();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Failed to delete resource');
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingItem(null);
        setFormData({
            type: 'timetable',
            branch: '',
            semester: '',
            title: '',
            documentUrl: '',
            description: ''
        });
    };

    return (
        <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-brand-accent" />
                    Academics Management
                </h2>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-brand-accent hover:bg-brand-accent-hover text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Resource
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-surface-elevated rounded-2xl p-6 mb-8 border border-border-strong shadow-sm relative">
                    <button 
                        onClick={handleCancel}
                        className="absolute top-4 right-4 p-2 text-text-muted hover:bg-surface-highlight rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h3 className="text-lg font-bold text-text-main mb-6">
                        {editingItem ? 'Edit Resource' : 'Add New Academic Resource'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Resource Type *</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.type === 'timetable' ? 'bg-brand-accent/10 border-brand-accent text-brand-accent font-bold' : 'bg-surface-highlight border-border-strong text-text-muted hover:border-text-muted'}`}>
                                        <input type="radio" name="type" className="hidden" checked={formData.type === 'timetable'} onChange={() => setFormData({...formData, type: 'timetable'})} />
                                        <FileText className="w-4 h-4" /> Time Table
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.type === 'syllabus' ? 'bg-brand-accent/10 border-brand-accent text-brand-accent font-bold' : 'bg-surface-highlight border-border-strong text-text-muted hover:border-text-muted'}`}>
                                        <input type="radio" name="type" className="hidden" checked={formData.type === 'syllabus'} onChange={() => setFormData({...formData, type: 'syllabus'})} />
                                        <Book className="w-4 h-4" /> Syllabus
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Title *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none"
                                    placeholder="e.g. Mid-Sem Time Table"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Branch *</label>
                                <select
                                    required
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none"
                                >
                                    <option value="" disabled>Select Branch</option>
                                    {BRANCHES.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Semester *</label>
                                <select
                                    required
                                    value={formData.semester}
                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none"
                                >
                                    <option value="" disabled>Select Semester</option>
                                    {SEMESTERS.map(sem => (
                                        <option key={sem} value={sem}>{sem}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-text-muted mb-2">Document URL / Upload *</label>
                                <div className="flex gap-4 items-start">
                                    <input
                                        required
                                        type="url"
                                        value={formData.documentUrl}
                                        onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                                        className="flex-1 bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none"
                                        placeholder="Paste Google Drive link or upload file..."
                                    />
                                    <div className="flex-shrink-0">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileUpload}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={isUploading}
                                            className="bg-surface-highlight border border-border-strong text-text-main hover:bg-border-strong px-4 py-3 rounded-xl font-bold transition flex items-center gap-2"
                                        >
                                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 text-text-muted" />}
                                            Upload File
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-text-muted mb-2">Description / Notes (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="2"
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none resize-none"
                                    placeholder="Any additional information..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border-strong">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-3 bg-surface-highlight text-text-muted rounded-xl font-bold hover:bg-border-strong transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="flex-1 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-sm transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {editingItem ? 'Update Resource' : 'Save Resource'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-accent" /></div>
            ) : academicItems.length === 0 ? (
                <div className="text-center py-16 bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                    <GraduationCap className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-text-main mb-2">No Resources Found</h3>
                    <p className="text-text-muted">Add time tables and syllabi to help students.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {academicItems.map(item => (
                        <div key={item.id} className="bg-surface-elevated border border-border-strong rounded-2xl p-5 flex flex-col hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${item.type === 'timetable' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                                    {item.type === 'timetable' ? <FileText className="w-3 h-3" /> : <Book className="w-3 h-3" />}
                                    {item.type === 'timetable' ? 'Time Table' : 'Syllabus'}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition" title="Edit">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-text-main text-lg mb-1">{item.title}</h3>
                            <div className="text-sm font-medium text-text-main mb-3 bg-surface-highlight p-2 rounded-lg border border-border-strong">
                                {item.branch} • {item.semester}
                            </div>
                            
                            {item.description && (
                                <p className="text-sm text-text-muted line-clamp-2 mb-4 flex-1">{item.description}</p>
                            )}
                            
                            <div className="mt-auto pt-4 border-t border-border-strong">
                                <a 
                                    href={item.documentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-surface-highlight hover:bg-border-strong text-text-main rounded-xl text-sm font-bold transition"
                                >
                                    <ExternalLink className="w-4 h-4" /> View Document
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
