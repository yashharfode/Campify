'use client';

import React, { useState, useEffect, useRef } from 'react';
import OverviewDashboard from './admin/OverviewDashboard';
import EventCommandCenter from './admin/EventCommandCenter';
import {
    Plus, Edit2, Trash2, Save, X, Shield, Lock,
    Calendar, Users, Clock, Tag, AlertCircle, CheckCircle, FileText, Download, XCircle,
    UserPlus, Loader2, MessageSquare, Hash, Check, Image as ImageIcon, MapPin, LayoutDashboard, Tent, Megaphone, User, BookOpen, List, Package, GraduationCap, UserCog, MessageCircle, Menu, Search, Bell, MenuIcon, ChevronRight
} from 'lucide-react';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import toast from 'react-hot-toast';
import { uploadToCloudinary, getOptimizedImageUrl } from '../lib/cloudinary';
import ClubsManagerWithProvider from './admin/ClubsManager';
import AcademicsManager from './admin/AcademicsManager';

// ADMIN EMAILS - Sirf yeh emails wale users hi admin panel dekh sakte hain
const ADMIN_EMAILS = [
    'yash.harfode.sati@gmail.com',
    'yashharfode123@gmail.com'
];

const isAdminUser = (email) => ADMIN_EMAILS.includes(email);

export default function Admin({ user, userData, setActiveTab: setAppTab, setTargetClubId }) {
    const [activeTab, setActiveTab] = useState('overview'); // 'events' or 'users'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    // Missing state variables
    const [events, setEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [selectedManageEvent, setSelectedManageEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        type: '',
        date: '',
        location: '',
        description: '',
        category: 'Tech',
        color: 'blue',
        attendees: 0,
        image: '',
        featured: false,
        clubId: '',
        clubName: ''
    });

    // Banner State
    const [banners, setBanners] = useState([]);
    const [bannersLoading, setBannersLoading] = useState(true);
    const [isAddingBanner, setIsAddingBanner] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [bannerFormData, setBannerFormData] = useState({
        title: '',
        subtitle: '',
        cta: '',
        link: '',
        desktopImage: '',
        mobileImage: '',
        image: '', // Legacy fallback
        color: 'from-blue-900 to-slate-900',
        badge: 'FEATURED'
    });
    const desktopBannerFileInputRef = useRef(null);
    const mobileBannerFileInputRef = useRef(null);

    // Notes State
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [notesFilter, setNotesFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
    
    // Notes Categories State
    const [notesCategories, setNotesCategories] = useState({});
    const [notesCategoriesLoading, setNotesCategoriesLoading] = useState(true);
    const [categoryFormData, setCategoryFormData] = useState({
        branch: 'Computer Science (CSE)',
        customBranch: '',
        semester: 'Sem 1',
        customSemester: '',
        subject: ''
    });

    // Chat Groups State
    const [chatGroups, setChatGroups] = useState([]);
    const [chatGroupsLoading, setChatGroupsLoading] = useState(true);
    const [newChatGroupName, setNewChatGroupName] = useState('');
    const [newChatGroupDesc, setNewChatGroupDesc] = useState('');

    // Lost & Found State
    const [lostFoundItems, setLostFoundItems] = useState([]);
    const [lostFoundLoading, setLostFoundLoading] = useState(true);
    const [lostFoundFilter, setLostFoundFilter] = useState('all'); // 'all', 'pending', 'approved'

    // Scholarship State
    const [scholarships, setScholarships] = useState([]);
    const [scholarshipsLoading, setScholarshipsLoading] = useState(true);
    const [isAddingScholarship, setIsAddingScholarship] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState(null);
    const [scholarshipFormData, setScholarshipFormData] = useState({
        title: '',
        description: '',
        amount: '',
        deadline: '',
        eligibility: '',
        website: '',
        provider: ''
    });

    // Admin Management State
    const [admins, setAdmins] = useState([]);
    const [adminsLoading, setAdminsLoading] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');

    const fileInputRef = useRef(null);

    // Check if user is admin (hardcoded or from database)
    const [isDbAdmin, setIsDbAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(true);
    const isAdmin = isAdminUser(user?.email) || isAdminUser(userData?.email) || isDbAdmin;

    // Check if user is admin from database
    useEffect(() => {
        const checkDbAdmin = async () => {
            if (!user?.email) {
                setAdminCheckLoading(false);
                return;
            }

            try {
                const adminsRef = collection(db, 'artifacts', appId, 'admins');
                const snapshot = await getDocs(adminsRef);
                const adminEmails = snapshot.docs.map(doc => doc.data().email);
                setIsDbAdmin(adminEmails.includes(user.email.toLowerCase()));
            } catch (error) {
                console.error('Error checking admin status:', error);
            } finally {
                setAdminCheckLoading(false);
            }
        };

        checkDbAdmin();
    }, [user?.email]);

    useEffect(() => {
        if (isAdmin) {
            fetchEvents();
            fetchUsers();
            fetchBanners();
            fetchNotes();
            fetchLostFoundItems();
            fetchScholarships();
            fetchAdmins();
            fetchNotesCategories();
            fetchChatGroups();
            fetchClubs();
        }
    }, [isAdmin]);

    const fetchClubs = async () => {
        try {
            const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
            const snapshot = await getDocs(clubsRef);
            const fetchedClubs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setClubs(fetchedClubs);
        } catch (error) {
            console.error('Error fetching clubs:', error);
        }
    };

    const fetchEvents = async () => {
        try {
            const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
            const snapshot = await getDocs(eventsRef);
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(fetchedEvents);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
            setLoading(false);
        }
    };

    const fetchBanners = async () => {
        try {
            const bannersRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');
            const snapshot = await getDocs(bannersRef);
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBanners(fetchedBanners);
            setBannersLoading(false);
        } catch (error) {
            console.error('Error fetching banners:', error);
            toast.error('Failed to load banners');
            setBannersLoading(false);
        }
    };

    const handleBannerImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2097152) { // 2MB
                toast.error('Image too large! Max 2MB');
                return;
            }
            try {
                toast.loading(`Uploading ${type} banner...`, { id: 'adminUpload' });
                const url = await uploadToCloudinary(file);
                if (type === 'desktop') {
                    setBannerFormData(prev => ({ ...prev, desktopImage: url }));
                } else if (type === 'mobile') {
                    setBannerFormData(prev => ({ ...prev, mobileImage: url }));
                }
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} banner uploaded!`, { id: 'adminUpload' });
            } catch (error) {
                toast.error('Upload failed', { id: 'adminUpload' });
            }
        }
    };

    const handleBannerSubmit = async (e) => {
        e.preventDefault();
        try {
            const bannersRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');

            const bannerData = {
                ...bannerFormData,
                createdAt: serverTimestamp()
            };

            if (editingBanner) {
                const bannerDoc = doc(db, 'artifacts', appId, 'public', 'data', 'banners', editingBanner.id);
                await updateDoc(bannerDoc, bannerData);
                toast.success('Banner updated successfully!');
            } else {
                await addDoc(bannersRef, bannerData);
                toast.success('Banner added successfully!');
            }

            setBannerFormData({
                title: '',
                subtitle: '',
                cta: '',
                link: '',
                desktopImage: '',
                mobileImage: '',
                image: '',
                color: 'from-blue-900 to-slate-900',
                badge: 'FEATURED'
            });
            setIsAddingBanner(false);
            setEditingBanner(null);
            fetchBanners();
        } catch (error) {
            console.error('Error saving banner:', error);
            toast.error('Failed to save banner');
        }
    };

    const handleDeleteBanner = async (bannerId) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        try {
            const bannerDoc = doc(db, 'artifacts', appId, 'public', 'data', 'banners', bannerId);
            await deleteDoc(bannerDoc);
            toast.success('Banner deleted successfully!');
            fetchBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            toast.error('Failed to delete banner');
        }
    };

    const handleEditBanner = (banner) => {
        setEditingBanner(banner);
        setBannerFormData({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            cta: banner.cta || '',
            link: banner.link || '',
            image: banner.image || '',
            color: banner.color || 'from-blue-900 to-slate-900',
            badge: banner.badge || 'FEATURED'
        });
        setIsAddingBanner(true);
    };

    const fetchNotes = async () => {
        try {
            const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
            const snapshot = await getDocs(notesRef);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by createdAt desc
            items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setNotes(items);
            setNotesLoading(false);
        } catch (error) {
            console.error('Error fetching notes:', error);
            setNotesLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const adminsRef = collection(db, 'artifacts', appId, 'admins');
            const snapshot = await getDocs(adminsRef);
            const adminsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAdmins(adminsList);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setAdminsLoading(false);
        }
    };

    const fetchChatGroups = async () => {
        try {
            const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups');
            const snapshot = await getDocs(groupsRef);
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChatGroups(fetched);
        } catch (error) {
            console.error('Error fetching chat groups:', error);
        } finally {
            setChatGroupsLoading(false);
        }
    };

    const fetchNotesCategories = async () => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'metadata_notes_categories');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setNotesCategories(docSnap.data().categories || {});
            } else {
                // Initialize default categories
                const DEFAULT_CATEGORIES = {
                    "Computer Science (CSE)": {
                        "Sem 1": ["Mathematics-I", "Physics", "Basic Electrical Engineering", "Engineering Graphics"],
                        "Sem 2": ["Mathematics-II", "Chemistry", "Programming for Problem Solving", "English"],
                        "Sem 3": ["Data Structures", "Digital Logic", "Computer Organization", "Discrete Mathematics"],
                        "Sem 4": ["Operating Systems", "Design and Analysis of Algorithms", "Theory of Computation", "Object Oriented Programming"],
                        "Sem 5": ["Database Management Systems", "Computer Networks", "Software Engineering", "Compiler Design"],
                        "Sem 6": ["Web Technology", "Machine Learning", "Information Security", "Cloud Computing"],
                        "Sem 7": ["Artificial Intelligence", "Cryptography", "Data Science", "Mobile Computing"],
                        "Sem 8": ["Major Project", "Internet of Things", "Blockchain", "Cyber Security"]
                    },
                    "Cyber Security": {
                        "Sem 1": ["Mathematics-I", "Physics", "Basic Electrical Engineering", "Engineering Graphics"],
                        "Sem 2": ["Mathematics-II", "Chemistry", "Programming for Problem Solving", "English"],
                        "Sem 3": ["Data Structures", "Fundamentals of Cyber Security", "Computer Organization"],
                        "Sem 4": ["Operating Systems", "Network Security", "Cryptography"],
                        "Sem 5": ["Database Security", "Ethical Hacking", "Digital Forensics"],
                        "Sem 6": ["Web Application Security", "Malware Analysis", "Security Policies"],
                        "Sem 7": ["Incident Response", "Cloud Security", "IoT Security"],
                        "Sem 8": ["Major Project", "Advanced Cryptography"]
                    },
                    "AI & Data Science (AIDS)": {
                        "Sem 1": ["Mathematics-I", "Physics", "Basic Electrical Engineering", "Engineering Graphics"],
                        "Sem 2": ["Mathematics-II", "Chemistry", "Programming for Problem Solving", "English"],
                        "Sem 3": ["Data Structures", "Statistics for Data Science", "Python Programming"],
                        "Sem 4": ["Machine Learning Foundations", "Algorithms", "Data Visualization"],
                        "Sem 5": ["Deep Learning", "Big Data Analytics", "Natural Language Processing"],
                        "Sem 6": ["Computer Vision", "Reinforcement Learning", "Time Series Analysis"],
                        "Sem 7": ["AI Ethics", "Predictive Modeling", "Recommendation Systems"],
                        "Sem 8": ["Major Project", "Advanced AI"]
                    },
                    "Electronics & Comm (ECE)": {
                        "Sem 1": ["Mathematics-I", "Physics", "Basic Electrical", "Engineering Graphics"],
                        "Sem 2": ["Mathematics-II", "Chemistry", "Programming for Problem Solving", "English"],
                        "Sem 3": ["Electronic Devices", "Network Theory", "Signals and Systems"],
                        "Sem 4": ["Analog Circuits", "Digital Electronics", "Microprocessors"],
                        "Sem 5": ["Electromagnetic Waves", "Control Systems", "Digital Signal Processing"],
                        "Sem 6": ["Communication Systems", "VLSI Design", "Antennas"],
                        "Sem 7": ["Wireless Communication", "Optical Networks", "Embedded Systems"],
                        "Sem 8": ["Major Project", "Satellite Communication"]
                    }
                };
                await setDoc(docRef, { categories: DEFAULT_CATEGORIES });
                setNotesCategories(DEFAULT_CATEGORIES);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setNotesCategoriesLoading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!categoryFormData.subject.trim()) return;

        const branchToUse = categoryFormData.branch === 'NEW_BRANCH' ? categoryFormData.customBranch.trim() : categoryFormData.branch;
        const semToUse = categoryFormData.semester === 'NEW_SEMESTER' ? categoryFormData.customSemester.trim() : categoryFormData.semester;

        if (!branchToUse || !semToUse) {
            toast.error('Please specify branch and semester');
            return;
        }

        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'metadata_notes_categories');
            
            // Clone current state deeply
            const updatedCategories = JSON.parse(JSON.stringify(notesCategories));
            
            if (!updatedCategories[branchToUse]) {
                updatedCategories[branchToUse] = {};
            }
            if (!updatedCategories[branchToUse][semToUse]) {
                updatedCategories[branchToUse][semToUse] = [];
            }
            
            if (!updatedCategories[branchToUse][semToUse].includes(categoryFormData.subject)) {
                updatedCategories[branchToUse][semToUse].push(categoryFormData.subject);
            }

            await updateDoc(docRef, { categories: updatedCategories });
            setNotesCategories(updatedCategories);
            setCategoryFormData({ ...categoryFormData, subject: '', customBranch: '', customSemester: '' });
            toast.success('Subject added successfully!');
        } catch (error) {
            console.error('Error updating categories:', error);
            toast.error('Failed to add subject');
        }
    };

    const handleApproveNote = async (noteId) => {
        try {
            const noteDoc = doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId);
            await updateDoc(noteDoc, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                approvedBy: user.uid
            });
            toast.success('Note approved successfully!');
            fetchNotes();
        } catch (error) {
            console.error('Error approving note:', error);
            toast.error('Failed to approve note');
        }
    };

    const handleRejectNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to reject this note?')) return;
        try {
            const noteDoc = doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId);
            await updateDoc(noteDoc, {
                status: 'rejected'
            });
            toast.success('Note rejected');
            fetchNotes();
        } catch (error) {
            console.error('Error rejecting note:', error);
            toast.error('Failed to reject note');
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId));
            toast.success('Note deleted!');
            fetchNotes();
        } catch (error) {
            toast.error('Failed to delete note');
        }
    };

    const handleApproveChatGroup = async (groupId) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chat_groups', groupId), {
                status: 'active'
            });
            toast.success('Chat group approved!');
            fetchChatGroups();
        } catch (error) {
            toast.error('Failed to approve chat group');
        }
    };

    const handleCreateChatGroup = async (e) => {
        e.preventDefault();
        if (!newChatGroupName.trim() || !newChatGroupDesc.trim()) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups'), {
                name: newChatGroupName.trim(),
                description: newChatGroupDesc.trim(),
                createdBy: 'admin',
                status: 'active',
                type: 'group',
                createdAt: serverTimestamp(),
                members: []
            });
            toast.success('Chat group created!');
            setNewChatGroupName('');
            setNewChatGroupDesc('');
            fetchChatGroups();
        } catch (error) {
            toast.error('Failed to create chat group');
        }
    };

    const handleRejectChatGroup = async (groupId) => {
        if (!window.confirm('Are you sure you want to reject and delete this group request?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chat_groups', groupId));
            toast.success('Chat group request rejected!');
            fetchChatGroups();
        } catch (error) {
            toast.error('Failed to reject chat group');
        }
    };

    const handleDownloadNote = (note) => {
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

    // Lost & Found Functions
    const fetchLostFoundItems = async () => {
        try {
            const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'lost_and_found');
            const snapshot = await getDocs(itemsRef);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLostFoundItems(items);
            setLostFoundLoading(false);
        } catch (error) {
            console.error('Error fetching lost & found items:', error);
            toast.error('Failed to load items');
            setLostFoundLoading(false);
        }
    };

    const approveLostFoundItem = async (itemId) => {
        try {
            const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'lost_and_found', itemId);
            await updateDoc(itemRef, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                approvedBy: user.uid
            });
            toast.success('Item approved!');
            fetchLostFoundItems();
        } catch (error) {
            console.error('Error approving item:', error);
            toast.error('Failed to approve item');
        }
    };

    const deleteLostFoundItem = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lost_and_found', itemId));
            toast.success('Item deleted');
            fetchLostFoundItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete item');
        }
    };

    // Scholarship Functions
    const fetchScholarships = async () => {
        try {
            const scholarshipsRef = collection(db, 'artifacts', appId, 'public', 'data', 'scholarships');
            const snapshot = await getDocs(scholarshipsRef);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setScholarships(items);
            setScholarshipsLoading(false);
        } catch (error) {
            console.error('Error fetching scholarships:', error);
            setScholarshipsLoading(false);
        }
    };

    const handleAddScholarship = async () => {
        try {
            if (editingScholarship) {
                // Update existing scholarship
                const scholarshipRef = doc(db, 'artifacts', appId, 'public', 'data', 'scholarships', editingScholarship.id);
                await updateDoc(scholarshipRef, {
                    ...scholarshipFormData,
                    updatedAt: serverTimestamp()
                });
                toast.success('Scholarship updated!');
            } else {
                // Add new scholarship
                const scholarshipsRef = collection(db, 'artifacts', appId, 'public', 'data', 'scholarships');
                await addDoc(scholarshipsRef, { ...scholarshipFormData, createdAt: serverTimestamp(), createdBy: user.uid });
                toast.success('Scholarship added!');
            }
            setScholarshipFormData({ title: '', description: '', amount: '', deadline: '', eligibility: '', website: '', provider: '' });
            setIsAddingScholarship(false);
            setEditingScholarship(null);
            fetchScholarships();
        } catch (error) {
            console.error('Error saving scholarship:', error);
            toast.error(editingScholarship ? 'Failed to update scholarship' : 'Failed to add scholarship');
        }
    };

    const handleEditScholarship = (scholarship) => {
        setEditingScholarship(scholarship);
        setScholarshipFormData({
            title: scholarship.title || '',
            description: scholarship.description || '',
            amount: scholarship.amount || '',
            deadline: scholarship.deadline || '',
            eligibility: scholarship.eligibility || '',
            website: scholarship.website || '',
            provider: scholarship.provider || ''
        });
        setIsAddingScholarship(true);
    };

    const handleDeleteScholarship = async (id) => {
        if (!confirm('Delete this scholarship?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scholarships', id));
            toast.success('Scholarship deleted');
            fetchScholarships();
        } catch (error) {
            toast.error('Failed to delete scholarship');
        }
    };

    const handleGrantAdmin = async () => {
        if (!newAdminEmail || !newAdminEmail.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        if (!newAdminEmail.includes('@')) {
            toast.error('Please enter a valid email');
            return;
        }

        try {
            const adminsRef = collection(db, 'artifacts', appId, 'admins');
            await addDoc(adminsRef, {
                email: newAdminEmail.trim().toLowerCase(),
                grantedBy: user.email,
                grantedAt: serverTimestamp()
            });
            toast.success(`Admin access granted to ${newAdminEmail}`);
            setNewAdminEmail('');
            fetchAdmins();
        } catch (error) {
            console.error('Error granting admin access:', error);
            toast.error('Failed to grant admin access');
        }
    };

    
    const downloadEventParticipants = async (eventId, eventTitle) => {
        try {
            // Check subcollection 'participants' for the event
            const participantsRef = collection(db, 'artifacts', appId, 'events', eventId, 'participants');
            const snap = await getDocs(participantsRef);
            let csv = "Name,Email,Registered At\n";
            if (snap.empty) {
                toast.error('No participants found for this event.');
                return;
            }
            snap.forEach(doc => {
                const data = doc.data();
                const name = data.name || 'Unknown';
                const email = data.email || 'Unknown';
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                csv += `"${name}","${email}","${date}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${eventTitle.replace(/\s+/g, '_')}_participants.csv`;
            a.click();
            toast.success('Downloaded participants CSV');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export participants');
        }
    };

    const handleRevokeAdmin = async (adminId, adminEmail) => {
        // Prevent self-deletion
        if (adminEmail === user.email) {
            toast.error('You cannot remove yourself as admin');
            return;
        }

        if (!confirm(`Revoke admin access for ${adminEmail}?`)) return;

        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'admins', adminId));
            toast.success('Admin access revoked');
            fetchAdmins();
        } catch (error) {
            console.error('Error revoking admin:', error);
            toast.error('Failed to revoke admin access');
        }
    };

    const fetchUsers = async () => {
        try {
            // Use collectionGroup to query all profile/data documents
            const usersQuery = collectionGroup(db, 'profile');
            const snapshot = await getDocs(usersQuery);

            const fetchedUsers = [];
            snapshot.forEach(docSnap => {
                // Check if it belongs to this app
                if (docSnap.ref.path.includes(appId)) {
                    const data = docSnap.data();
                    // Extract userId from path
                    const pathParts = docSnap.ref.path.split('/');
                    const userIdIndex = pathParts.indexOf('users');
                    const userId = userIdIndex !== -1 ? pathParts[userIdIndex + 1] : docSnap.id;

                    fetchedUsers.push({
                        id: userId,
                        ...data
                    });
                }
            });

            setUsers(fetchedUsers);
            setUsersLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
            setUsersLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2097152) { // 2MB
                toast.error('Image too large! Max 2MB');
                return;
            }
            try {
                toast.loading('Uploading image...', { id: 'adminEventUpload' });
                const url = await uploadToCloudinary(file);
                setFormData(prev => ({ ...prev, image: url }));
                toast.success('Image uploaded!', { id: 'adminEventUpload' });
            } catch (error) {
                toast.error('Upload failed', { id: 'adminEventUpload' });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');

            const eventData = {
                ...formData,
                attendees: parseInt(formData.attendees) || 0,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: userData?.name || 'Admin'
            };

            if (editingEvent) {
                // Update existing event
                const eventDoc = doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id);
                await updateDoc(eventDoc, eventData);
                toast.success('Event updated successfully!');
            } else {
                // Add new event
                await addDoc(eventsRef, eventData);
                toast.success('Event added successfully!');
            }

            setFormData({
                title: '',
                type: '',
                date: '',
                location: '',
                description: '',
                category: 'Tech',
                color: 'blue',
                attendees: 0,
                image: '',
                featured: false
            });
            setIsAddingEvent(false);
            setEditingEvent(null);
            fetchEvents();
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error('Failed to save event');
        }
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title || '',
            type: event.type || '',
            date: event.date || '',
            location: event.location || '',
            description: event.description || '',
            category: event.category || 'Tech',
            color: event.color || 'blue',
            attendees: event.attendees || 0,
            image: event.image || '',
            featured: event.featured || false,
            clubId: event.clubId || '',
            clubName: event.clubName || ''
        });
        setIsAddingEvent(true);
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;

        try {
            const eventDoc = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
            await deleteDoc(eventDoc);
            toast.success('Event deleted successfully!');
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to delete event');
        }
    };

    const handleToggleRegistration = async (eventId, currentStatus) => {
        try {
            const eventRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
            await updateDoc(eventRef, {
                isRegistrationOpen: !currentStatus
            });
            toast.success(`Registrations ${!currentStatus ? 'opened' : 'closed'}!`);
            setEvents(events.map(e => e.id === eventId ? { ...e, isRegistrationOpen: !currentStatus } : e));
        } catch (error) {
            console.error('Error toggling registration:', error);
            toast.error('Failed to update registration status');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            // Construct the path to the user's profile data document
            // Path: artifacts/{appId}/users/{userId}/profile/data
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');

            await deleteDoc(userDocRef);

            // Update local state
            setUsers(users.filter(user => user.id !== userId));
            toast.success('User deleted successfully');

            // If the deleted user was selected in the modal, close it
            if (selectedUser && selectedUser.id === userId) {
                setIsUserModalOpen(false);
                setSelectedUser(null);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        }
    };

    const handleCancel = () => {
        setIsAddingEvent(false);
        setEditingEvent(null);
        setFormData({
            title: '',
            type: '',
            date: '',
            location: '',
            description: '',
            category: 'Tech',
            color: 'blue',
            attendees: 0,
            image: '',
            featured: false
        });
    };

    // Show loading while checking admin status
    if (adminCheckLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#111827] mx-auto mb-4" />
                    <p className="text-[#111827] text-lg font-semibold">Checking access...</p>
                </div>
            </div>
        );
    }

    // If not admin, show access denied
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-surface-elevated flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-3">Access Denied</h2>
                    <p className="text-text-muted mb-6">You don't have permission to access the Admin Panel.</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="text-left">
                                <p className="text-sm font-semibold text-yellow-900 mb-1">Admin Access Required</p>
                                <p className="text-xs text-yellow-800">Only authorized administrators can manage events.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const ADMIN_TABS = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'clubs', label: 'Clubs', icon: <Tent className="w-5 h-5" /> },
        { id: 'events', label: 'Events', icon: <Megaphone className="w-5 h-5" /> },
        { id: 'users', label: 'Users', icon: <User className="w-5 h-5" /> },
        { id: 'banners', label: 'Banners', icon: <ImageIcon className="w-5 h-5" /> },
        { id: 'notes', label: 'Notes', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'notes_categories', label: 'Notes Categories', icon: <List className="w-5 h-5" /> },
        { id: 'lostfound', label: 'Lost & Found', icon: <Package className="w-5 h-5" /> },
        { id: 'academics', label: 'Academics', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'scholarships', label: 'Scholarships', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'admins', label: 'Admins', icon: <UserCog className="w-5 h-5" /> },
        { id: 'chat_groups', label: 'Chat Groups', icon: <MessageCircle className="w-5 h-5" /> }
    ];

    return (
        <div className="flex h-screen bg-surface-base overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[100] flex">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <aside className="relative w-64 bg-surface-elevated h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
                        <div className="p-6 pb-2 flex items-center justify-between">
                            <h1 className="text-2xl font-black text-text-main flex items-center gap-2">
                                <Shield className="w-6 h-6 text-brand-accent" />
                                Quantum
                            </h1>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-text-muted hover:text-text-main">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 mb-4">
                            <div className="inline-flex items-center gap-2 bg-brand-accent/10 text-brand-accent px-3 py-1.5 rounded-full border border-brand-accent/20">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">Admin Privileges</span>
                            </div>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                            {ADMIN_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === tab.id ? 'bg-brand-accent text-[#111827] shadow-md' : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
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
                    {ADMIN_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === tab.id ? 'bg-brand-accent text-[#111827] shadow-md' : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'}`}
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
                <header className="h-16 bg-surface-elevated border-b border-border-strong flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                        <button 
                            className="md:hidden p-2 text-text-muted hover:text-text-main hover:bg-surface-highlight rounded-lg transition"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Search className="w-5 h-5 text-text-muted hidden sm:block" />
                        <input type="text" placeholder="Search across platform..." className="bg-transparent border-none text-sm text-text-main focus:outline-none w-full max-w-md placeholder-text-muted hidden sm:block" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-text-muted hover:text-text-main hover:bg-surface-highlight rounded-full transition hidden sm:block">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-border-strong mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            {activeTab === 'events' && (
                                <button
                                    onClick={() => setIsAddingEvent(true)}
                                    className="bg-brand-accent hover:bg-brand-accent/90 text-[#111827] px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Create Event
                                </button>
                            )}
                            {activeTab === 'banners' && (
                                <button
                                    onClick={() => setIsAddingBanner(true)}
                                    className="bg-brand-accent hover:bg-brand-accent/90 text-[#111827] px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Banner
                                </button>
                            )}
                            {activeTab === 'scholarships' && (
                                <button
                                    onClick={() => setIsAddingScholarship(true)}
                                    className="bg-brand-accent hover:bg-brand-accent/90 text-[#111827] px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Scholarship
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <OverviewDashboard users={users} events={events} notes={notes} />
                    )}

                    {/* Clubs Management Tab */}
                    {activeTab === 'clubs' && (
                        <div className="mt-6">
                            <ClubsManagerWithProvider user={user} setAppTab={setAppTab} setTargetClubId={setTargetClubId} />
                        </div>
                    )}

                    {/* Academics Management Tab */}
                    {activeTab === 'academics' && (
                        <AcademicsManager user={user} />
                    )}

                    {/* Add/Edit Event Form */}
                    {isAddingEvent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-surface-base rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-border-strong flex justify-between items-center sticky top-0 bg-surface-base z-10">
                            <h3 className="font-bold text-xl text-text-main">
                                {editingEvent ? 'Edit Event' : 'Add New Event'}
                            </h3>
                            <button onClick={handleCancel}>
                                <X className="w-6 h-6 text-text-muted hover:text-text-muted" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Event Image</label>
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    className="border-2 border-dashed border-border-subtle bg-surface-highlight text-[#111827] rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition relative overflow-hidden"
                                >
                                    {formData.image ? (
                                        <img src={getOptimizedImageUrl(formData.image, '16:9')} className="w-full h-full object-contain" alt="Preview" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-10 h-10 text-text-muted mb-2" />
                                            <span className="text-sm text-text-muted">Click to upload image</span>
                                        </>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <p className="text-xs text-text-muted mt-2">
                                        💡 Suggested size: 1200×600 pixels (Images of other sizes will display without zooming)
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Event Title *</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Hackathon Night"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Event Type *</label>
                                    <input
                                        required
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Workshop, Competition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Date & Time *</label>
                                    <input
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Dec 5, 3 PM"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Location *</label>
                                    <input
                                        required
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., CS Lab 301"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent resize-none"
                                    placeholder="Event description..."
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                    >
                                        <option>Tech</option>
                                        <option>Arts</option>
                                        <option>Business</option>
                                        <option>Cultural</option>
                                        <option>Sports</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Color</label>
                                    <select
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                    >
                                        <option value="blue">Blue</option>
                                        <option value="orange">Orange</option>
                                        <option value="green">Green</option>
                                        <option value="purple">Purple</option>
                                        <option value="pink">Pink</option>
                                        <option value="yellow">Yellow</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Attendees</label>
                                    <input
                                        type="number"
                                        value={formData.attendees}
                                        onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="featured"
                                    checked={formData.featured}
                                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                    className="w-4 h-4 text-brand-accent rounded focus:ring-2 focus:ring-[#C08457]"
                                />
                                <label htmlFor="featured" className="text-sm font-bold text-text-muted">Mark as Featured Event</label>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-text-muted mb-2">Hosting Club (Optional)</label>
                                <select
                                    value={formData.clubId}
                                    onChange={(e) => {
                                        const selectedClub = clubs.find(c => c.id === e.target.value);
                                        setFormData({ 
                                            ...formData, 
                                            clubId: e.target.value, 
                                            clubName: selectedClub ? selectedClub.name : '' 
                                        });
                                    }}
                                    className="w-full bg-surface-base border border-border-strong rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-brand-accent transition"
                                >
                                    <option value="">No Club (Global Event)</option>
                                    {clubs.map(club => (
                                        <option key={club.id} value={club.id}>{club.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-accent hover:bg-[#386d31] text-[#111827] py-3 rounded-xl font-bold hover:shadow-md transition"
                                >
                                    <Save className="w-5 h-5 inline mr-2" />
                                    {editingEvent ? 'Update Event' : 'Add Event'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 bg-surface-highlight text-text-muted rounded-xl font-bold hover:bg-surface-highlight transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Banner Modal */}
            {isAddingBanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface-base rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border-strong">
                        <div className="p-6 border-b border-border-strong flex justify-between items-center sticky top-0 bg-surface-base z-10">
                            <h3 className="font-bold text-xl text-text-main">
                                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                            </h3>
                            <button onClick={() => { setIsAddingBanner(false); setEditingBanner(null); }}>
                                <X className="w-6 h-6 text-text-muted hover:text-text-muted" />
                            </button>
                        </div>

                        <form onSubmit={handleBannerSubmit} className="p-6 space-y-4">
                            {/* Image Upload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Desktop Banner Image *</label>
                                    <div
                                        onClick={() => desktopBannerFileInputRef.current.click()}
                                        className="border-2 border-dashed border-border-subtle rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-[#C08457] transition relative overflow-hidden bg-surface-elevated"
                                    >
                                        {bannerFormData.desktopImage || bannerFormData.image ? (
                                            <img src={getOptimizedImageUrl(bannerFormData.desktopImage || bannerFormData.image, '16:9')} className="w-full h-full object-contain" alt="Preview" />
                                        ) : (
                                            <>
                                                <ImageIcon className="w-10 h-10 text-text-muted mb-2" />
                                                <span className="text-sm text-text-muted">Click to upload</span>
                                            </>
                                        )}
                                        <input
                                            ref={desktopBannerFileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleBannerImageUpload(e, 'desktop')}
                                        />
                                        <p className="text-xs text-text-muted mt-2 px-2 text-center">
                                            💡 21:9 Ratio (e.g. 2100x900)
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Mobile Banner Image *</label>
                                    <div
                                        onClick={() => mobileBannerFileInputRef.current.click()}
                                        className="border-2 border-dashed border-border-subtle rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-[#C08457] transition relative overflow-hidden bg-surface-elevated"
                                    >
                                        {bannerFormData.mobileImage ? (
                                            <img src={getOptimizedImageUrl(bannerFormData.mobileImage, '16:9')} className="w-full h-full object-contain" alt="Preview" />
                                        ) : (
                                            <>
                                                <ImageIcon className="w-10 h-10 text-text-muted mb-2" />
                                                <span className="text-sm text-text-muted">Click to upload</span>
                                            </>
                                        )}
                                        <input
                                            ref={mobileBannerFileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleBannerImageUpload(e, 'mobile')}
                                        />
                                        <p className="text-xs text-text-muted mt-2 px-2 text-center">
                                            💡 16:9 Ratio
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Title *</label>
                                    <input
                                        required
                                        value={bannerFormData.title}
                                        onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Hackathon 2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Subtitle *</label>
                                    <input
                                        required
                                        value={bannerFormData.subtitle}
                                        onChange={(e) => setBannerFormData({ ...bannerFormData, subtitle: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Win big prizes!"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">CTA Text</label>
                                    <input
                                        value={bannerFormData.cta}
                                        onChange={(e) => setBannerFormData({ ...bannerFormData, cta: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., Register Now"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">CTA Link</label>
                                    <input
                                        type="url"
                                        value={bannerFormData.link}
                                        onChange={(e) => setBannerFormData({ ...bannerFormData, link: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="https://example.com/register"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-2">Badge Text</label>
                                    <input
                                        value={bannerFormData.badge}
                                        onChange={(e) => setBannerFormData({ ...bannerFormData, badge: e.target.value })}
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                        placeholder="e.g., FEATURED"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Gradient Color</label>
                                <select
                                    value={bannerFormData.color}
                                    onChange={(e) => setBannerFormData({ ...bannerFormData, color: e.target.value })}
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:ring-2 focus:ring-[#C08457] focus:border-transparent"
                                >
                                    <option value="from-blue-900 to-slate-900">Blue Night</option>
                                    <option value="from-purple-900 to-indigo-900">Purple Haze</option>
                                    <option value="from-emerald-800 to-teal-900">Emerald City</option>
                                    <option value="from-rose-900 to-pink-900">Rose Garden</option>
                                    <option value="from-orange-800 to-red-900">Sunset</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-accent hover:bg-[#386d31] text-[#111827] py-3 rounded-xl font-bold hover:shadow-md transition"
                                >
                                    <Save className="w-5 h-5 inline mr-2" />
                                    {editingBanner ? 'Update Banner' : 'Add Banner'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsAddingBanner(false); setEditingBanner(null); }}
                                    className="px-6 bg-surface-highlight text-text-muted rounded-xl font-bold hover:bg-surface-highlight transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {isUserModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface-base rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="absolute top-4 right-4 bg-black/20 text-[#111827] p-2 rounded-full hover:bg-black/30 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 pb-6">
                            <div className="relative -mt-16 mb-4 flex flex-col items-center">
                                <div className="w-32 h-32 rounded-full border-4 border-white bg-surface-highlight overflow-hidden shadow-md">
                                    {selectedUser.profileImage ? (
                                        <img src={selectedUser.profileImage} className="w-full h-full object-cover" alt={selectedUser.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-surface-elevated text-text-muted">
                                            <Users className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-text-main mt-2">{selectedUser.name}</h3>
                                <p className="text-blue-600 font-medium text-sm">@{selectedUser.username || 'username'}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-surface-elevated p-3 rounded-xl">
                                        <p className="text-xs text-text-muted uppercase font-bold">Branch</p>
                                        <p className="font-bold text-text-main">{selectedUser.branch || 'N/A'}</p>
                                    </div>
                                    <div className="bg-surface-elevated p-3 rounded-xl">
                                        <p className="text-xs text-text-muted uppercase font-bold">Year</p>
                                        <p className="font-bold text-text-main">{selectedUser.year || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-text-muted uppercase font-bold mb-1">Email</p>
                                    <p className="text-text-main text-sm font-medium">{selectedUser.email}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-text-muted uppercase font-bold mb-1">Bio</p>
                                    <p className="text-text-muted text-sm bg-surface-elevated p-3 rounded-xl">{selectedUser.bio || 'No bio available.'}</p>
                                </div>

                                <div className="pt-2">
                                    <p className="text-xs text-text-muted uppercase font-bold mb-2">Visibility</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${selectedUser.isVisibleInTeams !== false ? 'bg-green-100 text-green-700' : 'bg-surface-elevated text-text-muted'}`}>
                                        {selectedUser.isVisibleInTeams !== false ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                        {selectedUser.isVisibleInTeams !== false ? 'Visible in Teams' : 'Hidden from Teams'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'events' ? (
                /* Events List */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <h2 className="text-xl font-bold text-text-main mb-4">All Events ({events.length})</h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-[#C08457] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-text-muted mt-4">Loading events...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 text-text-muted">
                            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>No events yet. Add your first event!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {events.map(event => (
                                <div key={event.id} className="border border-border-strong rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition">
                                    {event.image && (
                                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-elevated">
                                            <img src={getOptimizedImageUrl(event.image, '16:9')} alt={event.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="font-bold text-text-main text-lg">{event.title}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{event.type}</span>
                                                    <span className="text-xs bg-surface-elevated text-text-muted px-2 py-1 rounded-full font-bold">{event.category}</span>
                                                    {event.featured && (
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">Featured</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-sm text-text-muted">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" /> {event.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" /> {event.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {event.attendees} attending
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        <button
                                            onClick={() => handleToggleRegistration(event.id, event.isRegistrationOpen)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                event.isRegistrationOpen !== false
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                        >
                                            {event.isRegistrationOpen !== false ? 'Open' : 'Closed'}
                                        </button>
                                        <button onClick={() => setSelectedManageEvent(event)} className="px-3 py-1.5 bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-[#111827] rounded-lg text-sm font-bold transition flex items-center gap-2" title="Command Center"><Users className="w-4 h-4" /> Manage</button>
                                        <button
                                            onClick={() => handleEdit(event)}
                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'banners' ? (
                /* Banners List */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <h2 className="text-xl font-bold text-text-main mb-4">Homepage Banners ({banners.length})</h2>

                    {bannersLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-[#C08457] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-text-muted mt-4">Loading banners...</p>
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="text-center py-12 text-text-muted">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>No banners yet. Add your first banner!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {banners.map(banner => (
                                <div key={banner.id} className={`relative rounded-2xl overflow-hidden shadow-md aspect-[2/1] bg-gradient-to-r ${banner.color}`}>
                                    {banner.image && (
                                        <img src={getOptimizedImageUrl(banner.image, '16:9')} alt={banner.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    )}
                                    <div className="absolute inset-0 p-6 flex flex-col justify-center text-[#111827] z-10">
                                        <span className="text-xs font-bold bg-surface-base/20 backdrop-blur-md px-2 py-1 rounded-full self-start mb-2">{banner.badge}</span>
                                        <h3 className="text-2xl font-bold mb-1">{banner.title}</h3>
                                        <p className="text-sm opacity-90 mb-4">{banner.subtitle}</p>
                                        <button
                                            onClick={() => {
                                                if (banner.link) {
                                                    window.open(banner.link, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            className="bg-surface-base text-text-main px-4 py-2 rounded-lg text-xs font-bold self-start disabled:opacity-70"
                                            disabled={!banner.link}
                                            title={banner.link ? 'Open CTA link' : 'Add CTA link to make this clickable'}
                                        >
                                            {banner.cta || 'Learn More'}
                                        </button>
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                                        <button onClick={() => handleEditBanner(banner)} className="p-2 bg-surface-base/20 hover:bg-surface-base/30 rounded-full backdrop-blur-md text-[#111827] transition">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteBanner(banner.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full backdrop-blur-md text-[#111827] transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'notes' ? (
                /* Notes Review */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                        <h2 className="text-xl font-bold text-text-main">Notes Management ({notes.length})</h2>
                        <div className="flex gap-2 bg-surface-elevated rounded-lg p-1 overflow-x-auto">
                            <button
                                onClick={() => setNotesFilter('all')}
                                className={`px-3 py-1 text-xs font-bold rounded transition ${notesFilter === 'all' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setNotesFilter('pending')}
                                className={`px-3 py-1 text-xs font-bold rounded transition ${notesFilter === 'pending' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setNotesFilter('approved')}
                                className={`px-3 py-1 text-xs font-bold rounded transition ${notesFilter === 'approved' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}
                            >
                                Approved
                            </button>
                            <button
                                onClick={() => setNotesFilter('rejected')}
                                className={`px-3 py-1 text-xs font-bold rounded transition ${notesFilter === 'rejected' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}
                            >
                                Rejected
                            </button>
                        </div>
                    </div>

                    {notesLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-[#C08457] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-text-muted mt-4">Loading notes...</p>
                        </div>
                    ) : notes.filter(n => notesFilter === 'all' || n.status === notesFilter).length === 0 ? (
                        <div className="text-center py-12 text-text-muted">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>No {notesFilter !== 'all' ? notesFilter : ''} notes found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notes.filter(n => notesFilter === 'all' || n.status === notesFilter).map(note => (
                                <div key={note.id} className="border border-border-strong rounded-xl p-4 hover:shadow-md transition">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 bg-surface-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-8 h-8 text-text-muted" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-text-main text-lg mb-1">{note.title}</h3>
                                                    <div className="flex gap-2 mb-2">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                                            {note.subject}
                                                        </span>
                                                        {note.status === 'approved' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                                <CheckCircle className="w-3 h-3" /> Approved
                                                            </span>
                                                        )}
                                                        {note.status === 'rejected' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                                <XCircle className="w-3 h-3" /> Rejected
                                                            </span>
                                                        )}
                                                        {note.status === 'pending' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                                                                <Clock className="w-3 h-3" /> Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-text-muted mb-2 line-clamp-2">{note.description || 'No description'}</p>
                                            <div className="flex gap-4 text-xs text-text-muted mb-3">
                                                <span>Uploaded by: {note.uploadedByName}</span>
                                                <span>File: {note.fileName}</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {note.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveNote(note.id)}
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-[#111827] rounded-lg text-sm font-bold transition flex items-center gap-2"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectNote(note.id)}
                                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition flex items-center gap-2"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="px-3 py-2 bg-surface-elevated hover:bg-surface-highlight text-text-muted rounded-lg text-sm transition ml-auto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'notes_categories' ? (
                /* Notes Categories Management */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <h2 className="text-xl font-bold text-text-main mb-6">Manage Notes Categories</h2>
                    
                    <form onSubmit={handleAddCategory} className="bg-surface-elevated rounded-xl p-6 mb-8 border border-border-strong">
                        <h3 className="font-bold text-text-muted mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-brand-accent" />
                            Add Missing Subject
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Branch</label>
                                <select
                                    value={categoryFormData.branch}
                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, branch: e.target.value })}
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-2.5 focus:ring-2 focus:ring-[#C08457] mb-2"
                                >
                                    {Object.keys(notesCategories).map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                    <option value="NEW_BRANCH">+ Add New Branch</option>
                                </select>
                                {categoryFormData.branch === 'NEW_BRANCH' && (
                                    <input
                                        type="text"
                                        value={categoryFormData.customBranch}
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, customBranch: e.target.value })}
                                        placeholder="Enter new branch name..."
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-2.5 focus:ring-2 focus:ring-[#C08457]"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Semester</label>
                                <select
                                    value={categoryFormData.semester}
                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, semester: e.target.value })}
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-2.5 focus:ring-2 focus:ring-[#C08457] mb-2"
                                >
                                    {['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'].map(sem => (
                                        <option key={sem} value={sem}>{sem}</option>
                                    ))}
                                    <option value="NEW_SEMESTER">+ Add Custom Semester</option>
                                </select>
                                {categoryFormData.semester === 'NEW_SEMESTER' && (
                                    <input
                                        type="text"
                                        value={categoryFormData.customSemester}
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, customSemester: e.target.value })}
                                        placeholder="e.g. Sem 9"
                                        className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-2.5 focus:ring-2 focus:ring-[#C08457]"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">New Subject Name</label>
                                <input
                                    required
                                    type="text"
                                    value={categoryFormData.subject}
                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, subject: e.target.value })}
                                    placeholder="e.g. Advanced AI"
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-2.5 focus:ring-2 focus:ring-[#C08457]"
                                />
                            </div>
                        </div>
                        <button type="submit" className="mt-4 bg-brand-accent hover:bg-[#386d31] text-[#111827] px-6 py-2 rounded-lg font-bold transition">
                            Add Subject
                        </button>
                    </form>

                    {notesCategoriesLoading ? (
                        <div className="text-center py-8 text-text-muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading categories...</div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(notesCategories).map(([branch, semesters]) => (
                                <div key={branch} className="border border-border-strong rounded-xl overflow-hidden">
                                    <div className="bg-surface-elevated px-4 py-3 border-b border-border-strong">
                                        <h4 className="font-black text-text-main">{branch}</h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {Object.entries(semesters).map(([sem, subjects]) => (
                                            <div key={sem} className="bg-surface-base border border-border-strong shadow-sm rounded-lg p-3">
                                                <h5 className="font-bold text-brand-accent text-sm mb-2">{sem}</h5>
                                                <ul className="text-sm text-text-muted space-y-1">
                                                    {subjects.map((sub, idx) => (
                                                        <li key={idx} className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>{sub}</li>
                                                    ))}
                                                    {subjects.length === 0 && <li className="text-text-muted italic">No subjects added</li>}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'lostfound' ? (
                /* Lost & Found Management */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-main">Lost & Found Items</h2>
                        <div className="flex gap-2 bg-surface-elevated p-1 rounded-lg">
                            <button onClick={() => setLostFoundFilter('all')} className={`px-3 py-1 text-xs font-bold rounded transition ${lostFoundFilter === 'all' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}>All</button>
                            <button onClick={() => setLostFoundFilter('pending')} className={`px-3 py-1 text-xs font-bold rounded transition ${lostFoundFilter === 'pending' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}>Pending</button>
                            <button onClick={() => setLostFoundFilter('approved')} className={`px-3 py-1 text-xs font-bold rounded transition ${lostFoundFilter === 'approved' ? 'bg-surface-base text-text-main shadow' : 'text-text-muted'}`}>Approved</button>
                        </div>
                    </div>
                    {lostFoundLoading ? (
                        <div className="text-center py-12"><Loader2 className="w-12 h-12 animate-spin text-brand-accent mx-auto mb-4" /><p className="text-text-muted">Loading...</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lostFoundItems.filter(item => lostFoundFilter === 'all' || item.status === lostFoundFilter).map(item => (
                                <div key={item.id} className="bg-surface-elevated rounded-xl p-4 border border-border-strong">
                                    {item.image && <img src={getOptimizedImageUrl(item.image, '4:3')} className="w-full h-32 object-cover rounded-lg mb-3" alt={item.itemName} />}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.type.toUpperCase()}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{item.status}</span>
                                    </div>
                                    <h3 className="font-bold text-text-main mb-1">{item.itemName}</h3>
                                    <p className="text-xs text-text-muted mb-2 line-clamp-2">{item.description}</p>
                                    <p className="text-xs text-text-muted mb-2">📍 {item.location} • 📅 {new Date(item.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-text-muted mb-3">👤 {item.postedByName}</p>
                                    <div className="flex gap-2">
                                        {item.status === 'pending' && (
                                            <button onClick={() => approveLostFoundItem(item.id)} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-[#111827] rounded-lg text-xs font-bold transition">Approve</button>
                                        )}
                                        <button onClick={() => deleteLostFoundItem(item.id)} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-[#111827] rounded-lg text-xs font-bold transition">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'scholarships' ? (
                /* Scholarship Management */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-main">Scholarships</h2>
                        {!isAddingScholarship && (
                            <button onClick={() => setIsAddingScholarship(true)} className="bg-brand-accent hover:bg-[#386d31] text-[#111827] px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Add Scholarship
                            </button>
                        )}
                    </div>

                    {isAddingScholarship && (
                        <div className="bg-surface-elevated rounded-xl p-6 mb-6 border border-border-strong">
                            <h3 className="font-bold text-text-main mb-4">{editingScholarship ? 'Edit Scholarship' : 'Add New Scholarship'}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Title *" value={scholarshipFormData.title} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, title: e.target.value })} className="border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" />
                                <input type="text" placeholder="Provider" value={scholarshipFormData.provider} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, provider: e.target.value })} className="border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" />
                                <input type="text" placeholder="Amount (₹50,000)" value={scholarshipFormData.amount} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, amount: e.target.value })} className="border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" />
                                <input type="date" placeholder="Deadline" value={scholarshipFormData.deadline} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, deadline: e.target.value })} className="border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" />
                                <input type="url" placeholder="Website URL" value={scholarshipFormData.website} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, website: e.target.value })} className="col-span-2 border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" />
                                <textarea placeholder="Description" value={scholarshipFormData.description} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, description: e.target.value })} className="col-span-2 border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" rows="2"></textarea>
                                <textarea placeholder="Eligibility Criteria" value={scholarshipFormData.eligibility} onChange={(e) => setScholarshipFormData({ ...scholarshipFormData, eligibility: e.target.value })} className="col-span-2 border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3" rows="2"></textarea>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={handleAddScholarship} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-[#111827] rounded-lg font-bold transition">
                                    {editingScholarship ? 'Update' : 'Save'}
                                </button>
                                <button onClick={() => { setIsAddingScholarship(false); setEditingScholarship(null); setScholarshipFormData({ title: '', description: '', amount: '', deadline: '', eligibility: '', website: '', provider: '' }); }} className="px-6 py-2 bg-surface-highlight hover:bg-surface-highlight text-text-muted rounded-lg font-bold transition">Cancel</button>
                            </div>
                        </div>
                    )}

                    {scholarshipsLoading ? (
                        <div className="text-center py-12"><Loader2 className="w-12 h-12 animate-spin text-brand-accent mx-auto mb-4" /><p className="text-text-muted">Loading...</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scholarships.map(scholarship => (
                                <div key={scholarship.id} className="bg-gradient-to-br from-[#FFFFFF] to-[#F3F0EA] rounded-xl p-4 border border-[#333]">
                                    <h3 className="font-bold text-text-main mb-2">{scholarship.title}</h3>
                                    <p className="text-sm text-text-muted mb-2">{scholarship.provider}</p>
                                    <p className="text-xs text-text-muted mb-2 line-clamp-2">{scholarship.description}</p>
                                    <div className="space-y-1 text-xs text-text-muted mb-3">
                                        <p>💰 {scholarship.amount}</p>
                                        <p>📅 Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</p>
                                        <p className="line-clamp-1">✓ {scholarship.eligibility}</p>
                                    </div>
                                    {scholarship.website && (
                                        <a href={scholarship.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline mb-2 block">Visit Website →</a>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleEditScholarship(scholarship)} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-[#111827] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                            <Edit2 className="w-3 h-3" /> Edit
                                        </button>
                                        <button onClick={() => handleDeleteScholarship(scholarship.id)} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-[#111827] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'admins' ? (
                /* Admin Management */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
                            <Shield className="w-6 h-6 text-brand-accent" />
                            Admin Management
                        </h2>
                    </div>

                    {/* Add Admin Form */}
                    <div className="bg-gradient-to-r from-[#FFFFFF] to-[#F3F0EA] border border-[#333] rounded-xl p-6 mb-6">
                        <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-brand-accent" />
                            Grant Admin Access
                        </h3>
                        <div className="flex gap-3">
                            <input
                                type="email"
                                placeholder="Enter email address"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleGrantAdmin()}
                                className="flex-1 border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#C08457]"
                            />
                            <button
                                onClick={handleGrantAdmin}
                                className="px-6 py-3 bg-brand-accent hover:bg-[#386d31] text-[#111827] rounded-lg font-bold hover:shadow-md transition flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Grant Access
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                            💡 Tip: Enter the full email address of the user you want to make an admin
                        </p>
                    </div>

                    {/* Current Admins List */}
                    <div>
                        <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-text-muted" />
                            Current Admins ({admins.length + 2})
                        </h3>

                        {adminsLoading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-accent mx-auto mb-4" />
                                <p className="text-text-muted">Loading admins...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Hardcoded Super Admins (Protected) */}
                                <div className="bg-surface-elevated border border-brand-accent rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-[#111827] font-bold">SA</div>
                                        <div>
                                            <p className="font-bold text-text-main">{ADMIN_EMAILS[0]}</p>
                                            <p className="text-xs text-text-muted">Super Admin (Protected)</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-accent/20 text-brand-accent border border-brand-accent/30">Protected</span>
                                </div>

                                <div className="bg-surface-elevated border border-brand-accent rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-[#111827] font-bold">SA</div>
                                        <div>
                                            <p className="font-bold text-text-main">{ADMIN_EMAILS[1]}</p>
                                            <p className="text-xs text-text-muted">Super Admin (Protected)</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-accent/20 text-brand-accent border border-brand-accent/30">Protected</span>
                                </div>

                                {/* Dynamic Admins from Database */}
                                {admins.map((admin) => (
                                    <div key={admin.id} className="bg-surface-base border border-border-strong rounded-xl p-4 flex items-center justify-between hover:shadow-md transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent font-bold">
                                                {admin.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-main">{admin.email}</p>
                                                <p className="text-xs text-text-muted">
                                                    Added by {admin.grantedBy} •{' '}
                                                    {admin.grantedAt?.seconds ? new Date(admin.grantedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                                            disabled={admin.email === user.email}
                                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <X className="w-4 h-4" /> Revoke
                                        </button>
                                    </div>
                                ))}

                                {admins.length === 0 && (
                                    <div className="text-center py-8 text-text-muted bg-surface-elevated rounded-xl border border-dashed border-border-subtle bg-surface-highlight text-[#111827]">
                                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-medium">No additional admins yet</p>
                                        <p className="text-xs mt-1">Use the form above to grant admin access</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'chat_groups' ? (
                /* Chat Groups Management */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-brand-accent" />
                        Chat Groups Management
                    </h2>

                    {/* Create New Group Form */}
                    <form onSubmit={handleCreateChatGroup} className="bg-gradient-to-r from-[#FFFFFF] to-[#F3F0EA] border border-[#333] rounded-xl p-6 mb-8">
                        <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-brand-accent" />
                            Create New Public Channel
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Channel Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newChatGroupName}
                                    onChange={(e) => setNewChatGroupName(e.target.value)}
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#C08457]"
                                    placeholder="e.g. Competitive Programming"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Description</label>
                                <input
                                    required
                                    type="text"
                                    value={newChatGroupDesc}
                                    onChange={(e) => setNewChatGroupDesc(e.target.value)}
                                    className="w-full border border-border-subtle bg-surface-highlight text-[#111827] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#C08457]"
                                    placeholder="What is this channel about?"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="bg-brand-accent hover:bg-[#386d31] text-[#111827] px-6 py-2 rounded-lg font-bold hover:shadow-md transition"
                        >
                            Create Channel
                        </button>
                    </form>

                    {/* Pending Requests */}
                    <div className="mb-8">
                        <h3 className="font-bold text-text-main mb-4">Pending Requests</h3>
                        {chatGroupsLoading ? (
                            <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-brand-accent mx-auto" /></div>
                        ) : chatGroups.filter(g => g.status === 'pending').length === 0 ? (
                            <p className="text-text-muted text-sm">No pending requests.</p>
                        ) : (
                            <div className="space-y-3">
                                {chatGroups.filter(g => g.status === 'pending').map(group => (
                                    <div key={group.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-text-main">{group.name}</p>
                                            <p className="text-sm text-text-muted">{group.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveChatGroup(group.id)} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg text-sm hover:bg-green-200 transition">Approve</button>
                                            <button onClick={() => handleRejectChatGroup(group.id)} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg text-sm hover:bg-red-200 transition">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Channels */}
                    <div>
                        <h3 className="font-bold text-text-main mb-4">Active Public Channels</h3>
                        {chatGroupsLoading ? (
                            <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-brand-accent mx-auto" /></div>
                        ) : chatGroups.filter(g => g.status === 'active' && g.type === 'group').length === 0 ? (
                            <p className="text-text-muted text-sm">No active channels.</p>
                        ) : (
                            <div className="space-y-3">
                                {chatGroups.filter(g => g.status === 'active' && g.type === 'group').map(group => (
                                    <div key={group.id} className="bg-surface-base border border-border-strong rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-text-main">{group.name}</p>
                                            <p className="text-sm text-text-muted">{group.description}</p>
                                        </div>
                                        <button onClick={() => handleRejectChatGroup(group.id)} className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-bold rounded hover:bg-red-100 transition">Delete</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Users List */
                <div className="bg-surface-base rounded-2xl shadow-md border border-border-strong p-6">
                    <h2 className="text-xl font-bold text-text-main mb-4">All Users ({users.length})</h2>

                    {usersLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-[#C08457] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-text-muted mt-4">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-text-muted">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>No users found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="md:hidden space-y-3">
                                {users.map(user => (
                                    <div key={user.id} className="border border-border-strong rounded-xl p-4 bg-surface-elevated">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-surface-highlight overflow-hidden">
                                                {user.profileImage ? (
                                                    <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-brand-accent/20 text-brand-accent font-bold">
                                                        {user.name ? user.name[0] : 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-text-main text-sm truncate">{user.name}</p>
                                                <p className="text-xs text-text-muted truncate">@{user.username || 'username'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-xs text-text-muted mb-3">
                                            <p className="truncate">Email: {user.email}</p>
                                            <p>Branch/Year: {user.branch || '-'} / {user.year || '-'}</p>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            {user.isVisibleInTeams !== false ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                    <CheckCircle className="w-3 h-3" /> Visible
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-elevated text-text-muted text-xs font-bold">
                                                    <Lock className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsUserModalOpen(true);
                                                    }}
                                                    className="text-brand-accent hover:text-indigo-800 font-bold text-xs"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-strong">
                                        <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase">User</th>
                                        <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase">Branch/Year</th>
                                        <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase">Email</th>
                                        <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase">Status</th>
                                        <th className="py-3 px-4 text-xs font-bold text-text-muted uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-gray-50 hover:bg-surface-elevated transition">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-surface-highlight overflow-hidden">
                                                        {user.profileImage ? (
                                                            <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-brand-accent/20 text-brand-accent font-bold">
                                                                {user.name ? user.name[0] : 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-text-main text-sm">{user.name}</p>
                                                        <p className="text-xs text-text-muted">@{user.username || 'username'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="text-sm text-text-muted">{user.branch || '-'}</p>
                                                <p className="text-xs text-text-muted">{user.year || '-'}</p>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-text-muted">{user.email}</td>
                                            <td className="py-3 px-4">
                                                {user.isVisibleInTeams !== false ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                        <CheckCircle className="w-3 h-3" /> Visible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-elevated text-text-muted text-xs font-bold">
                                                        <Lock className="w-3 h-3" /> Hidden
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsUserModalOpen(true);
                                                        }}
                                                        className="text-brand-accent hover:text-indigo-800 font-bold text-xs"
                                                    >
                                                        View Profile
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </>
                    )}
                </div>
            )}
                    {selectedManageEvent && (
                        <EventCommandCenter 
                            event={selectedManageEvent} 
                            onClose={() => setSelectedManageEvent(null)} 
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
