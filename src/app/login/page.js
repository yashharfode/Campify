'use client';

import React, { useState, useEffect, useRef } from 'react';
import HomeDashboard from '../../components/HomeDashboard';
import {
    Home, ShoppingBag, Users, Compass, User, Search, Bell, Plus, Heart, Upload,
    AlertCircle, Calendar, Download, Github, Linkedin, Filter, Menu, Settings,
    LogOut, ChevronRight, MapPin, Music, Code, Mic, Lightbulb,
    Edit3, ShieldCheck, ToggleRight, Briefcase, X, Megaphone, Loader2, Save, Camera,
    Link as LinkIcon, ExternalLink, CheckCircle2, Package, CreditCard, KeyRound, Layers,
    Shield, Database, Server, Clock, FileText, GraduationCap, MessageSquare
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, appId } from '../../lib/firebase';
import Marketplace from '../../components/Marketplace';
import Teams from '../../components/Teams';
import Discover from '../../components/Discover';
import Admin from '../../components/Admin';
import Notes from '../../components/Notes';
import Chat from '../../components/Chat';
import Academics from '../../components/Academics';
import LostAndFound from '../../components/LostAndFound';
import MentorChatBubble from '../../components/MentorChatBubble';
import ClubAdminDashboard from '../../components/admin/ClubAdminDashboard';
import ThemeToggle from '../../components/ThemeToggle';

import toast from 'react-hot-toast';
import { uploadToCloudinary, getOptimizedImageUrl } from '../../lib/cloudinary';

// --- MOCK DATA ---
const RECENT_ACTIVITY = [
    { id: 1, type: 'market', title: 'Engineering Drawing Drafter', price: '₹450', user: 'Rahul Verma', rating: 4.9, image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=2070&auto=format&fit=crop', tag: 'Marketplace' },
    { id: 2, type: 'event', title: 'Statewide Hackathon 2025', desc: 'Build the future in 48 hours', deadline: 'Dec 15, 2025', image: 'https://images.unsplash.com/photo-1504384308090-c54be3852f9d?q=80&w=2070&auto=format&fit=crop', tag: 'Event' },
];

const ADS_DATA = [
    { id: 1, title: "Technocrats Hackathon 2025", subtitle: "Win Prizes worth ₹1 Lakh", cta: "Register Now", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop", color: "from-blue-900 to-slate-900", badge: "FEATURED" },
    { id: 2, title: "50% Off on Java Books", subtitle: "Campus Book Store Sale", cta: "Grab Deal", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1587&auto=format&fit=crop", color: "from-emerald-800 to-teal-900", badge: "SALE" },
];

// --- AUTH COMPONENT ---
const AuthScreen = () => {
    const [mode, setMode] = useState('login');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        resetForm();
    };

    const validateUsername = (value) => {
        const sanitized = value.trim().toLowerCase();
        const regex = /^[a-z0-9._-]{3,20}$/;
        if (!regex.test(sanitized)) {
            throw new Error('Username should be 3-20 characters (letters, numbers, ., _, -)');
        }
        return sanitized;
    };

    const claimUsername = async (usernameValue, userId, allowAutoSuffix = false) => {
        let desired = validateUsername(usernameValue);
        let attempt = 0;
        while (attempt < 10) {
            const candidate = attempt === 0 ? desired : `${desired}${attempt}`;
            const usernameRef = doc(db, 'artifacts', appId, 'public', 'data', 'usernames', candidate);
            const usernameSnap = await getDoc(usernameRef);
            if (!usernameSnap.exists()) {
                await setDoc(usernameRef, {
                    userId,
                    username: candidate,
                    createdAt: serverTimestamp()
                });
                return candidate;
            }
            if (!allowAutoSuffix) {
                throw new Error('Username already taken. Try another one.');
            }
            attempt += 1;
        }
        throw new Error('Unable to find a unique username. Please try a different base.');
    };

    const saveUserProfile = async (user, profileData, options = { allowAutoUsername: false }) => {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        let finalUsername = profileData.username;

        if (!profileData.username) {
            throw new Error('Username is required');
        }

        finalUsername = await claimUsername(profileData.username, user.uid, options.allowAutoUsername);

        await setDoc(profileRef, {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            name: `${profileData.firstName} ${profileData.lastName}`.trim(),
            username: finalUsername,
            usernameLower: finalUsername.toLowerCase(),
            email: user.email,
            emailVerified: user.emailVerified,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'signup') {
                if (!firstName.trim() || !lastName.trim()) {
                    throw new Error('Please enter your first and last name');
                }
                if (!username.trim()) {
                    throw new Error('Please choose a username');
                }
                if (password.length < 6) {
                    throw new Error('Password should be at least 6 characters long');
                }
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await saveUserProfile(userCredential.user, {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    username
                });
                toast.success('Account created successfully!');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success('Logged in successfully!');
            }
        } catch (error) {
            console.error('Auth Error', error);
            toast.error(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
            const profileSnap = await getDoc(profileRef);

            if (!profileSnap.exists() || !profileSnap.data()?.username) {
                if (mode === 'signup') {
                    if (!firstName.trim() || !username.trim()) {
                        throw new Error('Please fill in first name and username before using Google sign up');
                    }
                    await saveUserProfile(user, {
                        firstName: firstName.trim(),
                        lastName: (lastName.trim() || user.displayName?.split(' ').slice(1).join(' ') || '').trim(),
                        username
                    });
                } else {
                    const displayNameParts = (user.displayName || 'Student User').split(' ');
                    const fallbackFirst = displayNameParts[0] || 'Student';
                    const fallbackLast = displayNameParts.slice(1).join(' ') || '';
                    const emailPrefix = user.email ? user.email.split('@')[0] : `user${Date.now()}`;
                    const finalUsername = await claimUsername(emailPrefix, user.uid, true);
                    await setDoc(profileRef, {
                        firstName: fallbackFirst,
                        lastName: fallbackLast,
                        name: `${fallbackFirst} ${fallbackLast}`.trim(),
                        username: finalUsername,
                        usernameLower: finalUsername.toLowerCase(),
                        email: user.email,
                        emailVerified: user.emailVerified,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }
            }
            toast.success('Signed in with Google');
        } catch (error) {
            console.error('Google Auth Error', error);
            toast.error(error.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!forgotPasswordEmail) {
            toast.error('Please enter your email');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, forgotPasswordEmail);
            toast.success('Password reset email sent!');
            setForgotPasswordOpen(false);
            setForgotPasswordEmail('');
        } catch (error) {
            console.error('Password reset error', error);
            if (error.code === 'auth/network-request-failed') {
                toast.error('Network error while reaching Firebase. Check your internet or disable blocking extensions.');
            } else if (error.code === 'auth/invalid-email') {
                toast.error('Please enter a valid registered email.');
            } else {
                toast.error(error.message || 'Failed to send reset email');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Soft decorative blurred circles matching the warm-beige/teal-green palette */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="bg-surface-elevated border border-border-strong p-8 rounded-3xl w-full max-w-md shadow-2xl z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 overflow-hidden shadow-md">
                        <img src="/logo.ico" alt="Campify Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black text-text-main mb-2">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
                    <p className="text-text-muted">Enter your credentials to continue</p>
                </div>

                <div className="flex gap-2 mb-6 bg-surface-base p-1 rounded-xl">
                    <button
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'login' ? 'bg-blue-600 text-[#111827] shadow-sm' : 'text-text-muted hover:text-text-muted'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => switchMode('signup')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'signup' ? 'bg-blue-600 text-[#111827] shadow-sm' : 'text-text-muted hover:text-text-muted'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                                        placeholder="Alex"
                                    />
                                </div>
                                <div>
                                    <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                                        placeholder="Sharma"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                                    placeholder="uniqueusername"
                                />
                                <p className="text-[10px] text-text-muted mt-1">3-20 chars (letters, numbers, ., _, -)</p>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="alex@college.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-text-muted"
                        />
                    </div>

                    <div>
                        <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-text-muted"
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label className="text-text-muted text-xs font-bold uppercase tracking-wider ml-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-surface-elevated border border-border-strong rounded-xl p-3 text-text-main mt-1 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-text-muted"
                            />
                        </div>
                    )}

                    {mode === 'login' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setForgotPasswordEmail(email);
                                    setForgotPasswordOpen(true);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-accent to-brand-accent-hover text-white font-black py-4 rounded-xl shadow-md transition-all transform hover:-translate-y-1 hover:shadow-[0_0_25px_var(--glow-primary)] active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Login Securely' : 'Create Account')}
                    </button>
                </form>

                <div className="my-4 flex items-center gap-2 text-text-muted text-xs">
                    <div className="flex-1 h-px bg-surface-highlight"></div>
                    OR
                    <div className="flex-1 h-px bg-surface-highlight"></div>
                </div>

                <button
                    onClick={handleGoogleAuth}
                    className="w-full border border-border-strong text-text-muted font-bold py-3 rounded-xl hover:bg-surface-base transition flex items-center justify-center gap-3 bg-surface-elevated"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.61 20.083H42V20H24v8h11.303C34.125 31.617 29.598 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.659 5.009 29.082 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.39-3.917z" /><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.077 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.659 5.009 29.082 3 24 3c-7.938 0-14.68 4.632-17.694 11.691z" /><path fill="#4CAF50" d="M24 43c5.522 0 10.508-2.115 14.167-5.564l-6.506-5.506C29.64 34.318 26.929 35 24 35c-5.564 0-10.279-3.559-11.957-8.483l-6.6 5.086C8.434 38.419 15.62 43 24 43z" /><path fill="#1976D2" d="M43.61 20.083H42V20H24v8h11.303C34.732 31.135 30.251 35 24 35c-5.564 0-10.279-3.559-11.957-8.483l-6.6 5.086C8.434 38.419 15.62 43 24 43c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.39-3.917z" /></svg>
                    {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                </button>
            </div>

            {/* Forgot Password Modal */}
            {forgotPasswordOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-surface-elevated rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-text-main mb-4">Reset Password</h3>
                        <form onSubmit={handlePasswordReset} className="space-y-3">
                            <input
                                type="email"
                                required
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                className="w-full border border-border-strong rounded-lg p-3 bg-surface-base text-text-main placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                                placeholder="Enter your email"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setForgotPasswordOpen(false)} className="flex-1 bg-surface-elevated text-text-muted font-bold py-3 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-[#111827] font-bold py-3 rounded-lg">Send Reset Link</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PROFILE COMPONENT (ROBUST & PERSISTENT) ---
const createEmptyProject = () => ({
    title: '',
    description: '',
    link: ''
});

const Profile = ({ user, userData, setActiveTab, isDbAdmin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [wishlistEvents, setWishlistEvents] = useState([]);
    const [wishlistLoading, setWishlistLoading] = useState(true);
    const [activeProfileTab, setActiveProfileTab] = useState('about'); // 'about', 'orders', 'sales'
    const [myOrders, setMyOrders] = useState([]);
    const [pendingSales, setPendingSales] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const fileInputRef = useRef(null);
    const fallbackPalettes = [
        'from-blue-500 via-indigo-500 to-purple-500',
        'from-rose-500 via-orange-400 to-amber-300',
        'from-emerald-500 via-teal-400 to-cyan-400',
        'from-fuchsia-500 via-pink-500 to-rose-400',
        'from-slate-500 via-gray-600 to-stone-500'
    ];
    const fallbackLabels = ['Campus Pro', 'Trusted Seller', 'Top Learner', 'Community Champ', 'New Member'];
    const fallbackSeedSource = formData.username || formData.email || formData.name || 'student';
    const fallbackSeed = fallbackSeedSource.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackGradient = fallbackPalettes[fallbackSeed % fallbackPalettes.length];
    const fallbackLabel = fallbackLabels[fallbackSeed % fallbackLabels.length];
    const fallbackInitials = ((formData.name || formData.username || 'Student').match(/\b\w/g) || [])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST';

    const defaultProfile = {
        name: 'Student Name',
        branch: 'Branch',
        year: 'Year',
        bio: '',
        skills: '',
        github: '',
        linkedin: '',
        profileImage: '',
        username: '',
        email: user?.email || '',
        isVisibleInTeams: true,
        projects: [createEmptyProject()]
    };

    const normalizeProfile = (data) => {
        const merged = { ...defaultProfile, ...(data || {}) };
        merged.projects = Array.isArray(merged.projects) && merged.projects.length
            ? merged.projects.map((project) => ({
                title: project?.title || '',
                description: project?.description || '',
                link: project?.link || ''
            }))
            : [createEmptyProject()];
        return merged;
    };

    // Initialize form data from userData
    useEffect(() => {
        setFormData(normalizeProfile(userData));
    }, [userData, user]);

    // Fetch Wishlist Items
    useEffect(() => {
        if (!user) return;
        const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'wishlist', 'items');
        const unsubscribe = onSnapshot(wishlistRef, async (docSnap) => {
            if (docSnap.exists()) {
                const itemIds = docSnap.data().itemIds || [];
                if (itemIds.length > 0) {
                    // Fetch all items and filter client-side (Firestore doesn't support 'in' with document IDs easily)
                    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'market_items');
                    const itemsSnapshot = await getDocs(itemsRef);
                    const allItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const wishlistItems = allItems.filter(item => itemIds.includes(item.id));
                    setWishlistItems(wishlistItems);
                } else {
                    setWishlistItems([]);
                }
            } else {
                setWishlistItems([]);
            }
            setWishlistLoading(false);
        }, (error) => {
            console.error("Error fetching wishlist:", error);
            setWishlistLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch Wishlist Events
    useEffect(() => {
        if (!user) return;
        const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'wishlist', 'events');
        const unsubscribe = onSnapshot(wishlistRef, async (docSnap) => {
            if (docSnap.exists()) {
                const eventIds = docSnap.data().eventIds || [];
                if (eventIds.length > 0) {
                    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
                    const eventsSnapshot = await getDocs(eventsRef);
                    const allEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const wishlistedEvents = allEvents.filter(event => eventIds.includes(event.id));
                    setWishlistEvents(wishlistedEvents);
                } else {
                    setWishlistEvents([]);
                }
            } else {
                setWishlistEvents([]);
            }
        }, (error) => {
            console.error("Error fetching wishlist events:", error);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch My Orders (as buyer)
    useEffect(() => {
        if (!user) return;
        const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
        const unsubscribe = onSnapshot(
            query(ordersRef, where('buyerId', '==', user.uid)),
            (snapshot) => {
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyOrders(orders);
                setOrdersLoading(false);
            },
            (error) => {
                console.error("Error fetching orders:", error);
                setOrdersLoading(false);
            }
        );
        return () => unsubscribe();
    }, [user]);

    // Fetch Pending Sales (as seller)
    useEffect(() => {
        if (!user) return;
        const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
        const unsubscribe = onSnapshot(
            query(ordersRef, where('sellerId', '==', user.uid)),
            (snapshot) => {
                const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setPendingSales(sales);
            },
            (error) => {
                console.error("Error fetching sales:", error);
            }
        );
        return () => unsubscribe();
    }, [user]);

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProjectChange = (index, field, value) => {
        setFormData(prev => {
            const updated = [...(prev.projects || [createEmptyProject()])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, projects: updated };
        });
    };

    const handleAddProject = () => {
        setFormData(prev => ({
            ...prev,
            projects: [...(prev.projects || []), createEmptyProject()]
        }));
    };

    const handleRemoveProject = (index) => {
        setFormData(prev => {
            const updated = [...(prev.projects || [])];
            if (updated.length === 1) {
                updated[0] = createEmptyProject();
            } else {
                updated.splice(index, 1);
            }
            return { ...prev, projects: updated };
        });
    };

    // Handle Image Upload (Cloudinary)
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2097152) { // 2MB limit
                toast.error("File is too large! Please upload an image under 2MB.");
                return;
            }
            try {
                toast.loading('Uploading profile image...', { id: 'profileUpload' });
                const url = await uploadToCloudinary(file);
                setFormData(prev => ({ ...prev, profileImage: url }));
                toast.success('Image uploaded successfully!', { id: 'profileUpload' });
            } catch (error) {
                console.error("Upload error:", error);
                toast.error('Failed to upload image.', { id: 'profileUpload' });
            }
        }
    };

    // Save Data to Firestore
    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // Path: artifacts/{appId}/users/{uid}/profile/data
            // This 6-segment path is crucial for Firestore
            const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');

            const sanitizedProjects = (formData.projects || [])
                .filter(project => (project.title || project.description || project.link))
                .map(project => ({
                    title: project.title?.trim() || '',
                    description: project.description?.trim() || '',
                    link: project.link?.trim() || ''
                }));

            await setDoc(userRef, {
                ...formData,
                projects: sanitizedProjects,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setFormData(prev => normalizeProfile({ ...prev, projects: sanitizedProjects }));

            setIsEditing(false);
            toast.success("Profile saved successfully!");
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Failed to save profile. " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-24 pt-0 min-h-screen bg-surface-base max-w-7xl mx-auto animate-in fade-in">
            {/* Header Dark Card */}
            <div className="bg-surface-elevated pt-8 pb-20 px-6 rounded-b-[3rem] relative shadow-md border-b border-border-strong">
                <div className="flex justify-between items-start text-text-main mb-4 max-w-2xl mx-auto">
                    <Settings className="w-6 h-6 cursor-pointer hover:rotate-90 transition opacity-80 hover:opacity-100" onClick={() => setIsEditing(prev => !prev)} />
                    <div className="bg-brand-accent/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-brand-accent/40 transition text-brand-accent">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="flex flex-col items-center max-w-md mx-auto relative z-10">
                    {/* Profile Image with Camera Icon */}
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full border-[6px] border-[#FAF7F2] bg-surface-elevated overflow-hidden shadow-2xl flex items-center justify-center text-[#111827] relative">
                            {formData.profileImage ? (
                                <img
                                    src={getOptimizedImageUrl(formData.profileImage, '1:1')}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient} flex flex-col items-center justify-center`}>
                                    <span className="text-3xl font-black tracking-wide">{fallbackInitials}</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] mt-1">{fallbackLabel}</span>
                                </div>
                            )}
                        </div>
                        {isEditing && (
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition duration-300"
                            >
                                <Camera className="text-[#111827] w-8 h-8" />
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {isEditing ? (
                        <div className="w-full space-y-3 px-4 animate-in slide-in-from-bottom-2">
                            <input
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                className="w-full bg-surface-base border border-border-subtle rounded-lg py-2 px-3 text-text-main placeholder-gray-500 text-center font-bold focus:outline-none focus:border-[#C08457] transition"
                                placeholder="Full Name"
                            />
                            <div className="flex gap-2">
                                <input
                                    name="branch"
                                    value={formData.branch || ''}
                                    onChange={handleChange}
                                    className="w-1/2 bg-surface-base border border-border-subtle rounded-lg py-2 px-3 text-text-main text-sm placeholder-gray-500 text-center focus:outline-none focus:border-[#C08457]"
                                    placeholder="Branch (e.g. CSE)"
                                />
                                <input
                                    name="year"
                                    value={formData.year || ''}
                                    onChange={handleChange}
                                    className="w-1/2 bg-surface-base border border-border-subtle rounded-lg py-2 px-3 text-text-main text-sm placeholder-gray-500 text-center focus:outline-none focus:border-[#C08457]"
                                    placeholder="Year (e.g. 3rd)"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <h2 className="text-text-main font-bold text-2xl tracking-tight">{formData.name || 'New Student'}</h2>
                                {(formData.email && (formData.email.endsWith('@jec.ac.in') || formData.email.endsWith('@college.edu'))) && (
                                    <div className="inline-flex items-center gap-1 bg-brand-accent/20 border border-[#C08457]/30 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                                        <span className="text-brand-accent text-[10px] font-bold">Verified</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-text-muted text-sm font-medium mt-1 opacity-90">{formData.branch || 'Branch'} • {formData.year || 'Year'}</p>
                            {formData.username && (
                                <p className="text-text-muted text-xs font-semibold mt-1 opacity-80">@{formData.username}</p>
                            )}
                            {formData.email && (
                                <p className="text-text-muted text-xs opacity-70">{formData.email}</p>
                            )}
                            {formData.email && !(formData.email.endsWith('@jec.ac.in') || formData.email.endsWith('@college.edu')) && (
                                <p className="text-text-muted text-xs mt-1 opacity-75">Guest User</p>
                            )}
                            <div className="mt-3 inline-flex items-center gap-1 bg-surface-base px-4 py-1 rounded-full border border-border-strong shadow-sm">
                                <span className="text-brand-accent">★</span>
                                <span className="text-text-muted text-xs font-bold tracking-wide">Trust Score: 4.9</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="px-4 md:px-6 mt-6 max-w-2xl mx-auto space-y-6 -translate-y-8 relative z-20">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <StatCard number="12" label="Sold" />
                    <StatCard number="8" label="Notes" color="text-green-600 bg-green-50" />
                    <StatCard number="5" label="Teams" color="text-purple-600 bg-purple-50" />
                </div>

                {/* Edit/Save Actions */}
                {isEditing ? (
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-brand-accent hover:bg-brand-accent-hover text-[#111827] py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Profile</>}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setFormData(normalizeProfile(userData)); // Reset changes
                            }}
                            className="px-4 bg-surface-highlight text-text-muted rounded-xl font-bold text-sm hover:bg-border-strong transition"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-surface-elevated text-brand-accent border-2 border-[#C08457]/20 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-surface-base transition flex items-center justify-center gap-2"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                )}

                {/* Profile Tabs */}
                <div className="flex gap-2 mb-6 bg-surface-elevated p-2 rounded-xl border border-border-strong">
                    <button
                        onClick={() => setActiveProfileTab('about')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${activeProfileTab === 'about'
                            ? 'bg-brand-accent text-[#111827] shadow-md'
                            : 'text-text-muted hover:bg-surface-base'
                            }`}
                    >
                        About
                    </button>
                    <button
                        onClick={() => setActiveProfileTab('orders')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${activeProfileTab === 'orders'
                            ? 'bg-brand-accent text-[#111827] shadow-md'
                            : 'text-text-muted hover:bg-surface-base'
                            }`}
                    >
                        My Orders ({myOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveProfileTab('sales')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${activeProfileTab === 'sales'
                            ? 'bg-brand-accent text-[#111827] shadow-md'
                            : 'text-text-muted hover:bg-surface-base'
                            }`}
                    >
                        Pending Sales ({pendingSales.filter(s => s.status === 'pending_meetup').length})
                    </button>
                </div>

                {/* About & Skills */}
                {activeProfileTab === 'about' && (
                    <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                        <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-4">
                            <h3 className="font-bold text-text-main flex items-center gap-2 text-lg">
                                <Briefcase className="w-5 h-5 text-brand-accent" /> About Me
                            </h3>
                            {isEditing && (
                                <div className="flex items-center gap-3 bg-surface-base px-4 py-2 rounded-lg border border-border-subtle">
                                    <ToggleRight
                                        className={`w-6 h-6 cursor-pointer transition ${formData.isVisibleInTeams ? 'text-brand-accent' : 'text-text-muted'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, isVisibleInTeams: !prev.isVisibleInTeams }))}
                                    />
                                    <span className="text-sm font-bold text-text-muted">Show me in Teams</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* BIO */}
                            <div>
                                <p className="text-xs text-text-muted font-bold uppercase mb-2 tracking-wider">Bio</p>
                                {isEditing ? (
                                    <textarea
                                        name="bio"
                                        value={formData.bio || ''}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full bg-surface-base border border-border-subtle rounded-xl p-3 text-sm text-text-muted focus:outline-none focus:border-[#C08457] resize-none transition"
                                        placeholder="Tell us about yourself..."
                                    />
                                ) : (
                                    <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                                        {formData.bio || "No bio added yet. Click edit to introduce yourself!"}
                                    </p>
                                )}
                            </div>

                            {/* SKILLS */}
                            <div>
                                <p className="text-xs text-text-muted font-bold uppercase mb-2 tracking-wider">Skills</p>
                                {isEditing ? (
                                    <input
                                        name="skills"
                                        value={formData.skills || ''}
                                        onChange={handleChange}
                                        className="w-full bg-surface-base border border-border-strong rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="React, Node.js, Design (Comma separated)..."
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.skills && formData.skills.length > 0 ? formData.skills.split(',').map((skill, i) => (
                                            <span key={i} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 shadow-sm">
                                                {skill.trim()}
                                            </span>
                                        )) : <span className="text-text-muted text-xs italic">No skills listed</span>}
                                    </div>
                                )}
                            </div>

                            {/* SOCIAL LINKS */}
                            <div>
                                <p className="text-xs text-text-muted font-bold uppercase mb-2 tracking-wider">Connect</p>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 bg-surface-base p-2 rounded-lg border border-border-strong">
                                            <Github className="w-4 h-4 text-text-muted" />
                                            <input
                                                name="github"
                                                value={formData.github || ''}
                                                onChange={handleChange}
                                                className="bg-transparent w-full text-sm outline-none placeholder:text-text-muted"
                                                placeholder="GitHub Profile URL"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-surface-base p-2 rounded-lg border border-border-strong">
                                            <Linkedin className="w-4 h-4 text-blue-600" />
                                            <input
                                                name="linkedin"
                                                value={formData.linkedin || ''}
                                                onChange={handleChange}
                                                className="bg-transparent w-full text-sm outline-none placeholder:text-text-muted"
                                                placeholder="LinkedIn Profile URL"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        {formData.github && (
                                            <a href={formData.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-text-muted hover:text-black transition">
                                                <Github className="w-5 h-5" /> GitHub
                                            </a>
                                        )}
                                        {formData.linkedin && (
                                            <a href={formData.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition">
                                                <Linkedin className="w-5 h-5" /> LinkedIn
                                            </a>
                                        )}
                                        {!formData.github && !formData.linkedin && <span className="text-text-muted text-xs italic">No social links added</span>}
                                    </div>
                                )}
                            </div>

                            {/* PROJECTS SHOWCASE */}
                            <div>
                                <p className="text-xs text-text-muted font-bold uppercase mb-2 tracking-wider">Projects Showcase</p>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        {(formData.projects || [createEmptyProject()]).map((project, index) => (
                                            <div key={index} className="border-2 border-border-strong rounded-xl p-4 space-y-2 bg-surface-base">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-text-muted">Project #{index + 1}</span>
                                                    {(formData.projects || []).length > 1 && (
                                                        <button
                                                            onClick={() => handleRemoveProject(index)}
                                                            className="text-red-500 hover:text-red-700 transition"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    value={project.title || ''}
                                                    onChange={(e) => handleProjectChange(index, 'title', e.target.value)}
                                                    className="w-full bg-surface-elevated border border-border-strong rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Project Title (e.g., E-commerce Website)"
                                                />
                                                <textarea
                                                    value={project.description || ''}
                                                    onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                                                    rows="2"
                                                    className="w-full bg-surface-elevated border border-border-strong rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="Brief description..."
                                                />
                                                <div className="flex items-center gap-2 bg-surface-elevated p-2 rounded-lg border border-border-strong">
                                                    <LinkIcon className="w-4 h-4 text-text-muted" />
                                                    <input
                                                        value={project.link || ''}
                                                        onChange={(e) => handleProjectChange(index, 'link', e.target.value)}
                                                        className="bg-transparent w-full text-sm outline-none placeholder:text-text-muted"
                                                        placeholder="Project URL (GitHub, Live Demo, etc.)"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddProject}
                                            className="w-full border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add Another Project
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.projects && formData.projects.filter(p => p.title || p.description || p.link).length > 0 ? (
                                            formData.projects.filter(p => p.title || p.description || p.link).map((project, index) => (
                                                <div key={index} className="bg-surface-base border border-border-strong rounded-xl p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-text-main">{project.title || 'Untitled Project'}</h4>
                                                        {project.link && (
                                                            <a
                                                                href={project.link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-blue-600 hover:text-blue-800 transition"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    {project.description && (
                                                        <p className="text-sm text-text-muted whitespace-pre-wrap">{project.description}</p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 bg-surface-base rounded-xl border border-dashed border-border-strong">
                                                <Briefcase className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                                                <p className="text-xs text-text-muted italic">No projects added yet. Click edit to showcase your work!</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* My Orders Section */}
                {activeProfileTab === 'orders' && (
                    <OrdersView orders={myOrders} loading={ordersLoading} user={user} />
                )}

                {/* Pending Sales Section */}
                {activeProfileTab === 'sales' && (
                    <PendingSalesView sales={pendingSales} user={user} />
                )}

                {/* Wishlist Section */}
                {activeProfileTab === 'about' && (
                    <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                        <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-4">
                            <h3 className="font-bold text-text-main flex items-center gap-2 text-lg">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Saved Items
                            </h3>
                        </div>
                        {wishlistLoading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                            </div>
                        ) : wishlistItems.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <Heart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No saved items yet. Start saving items you like!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {wishlistItems.map((item) => (
                                    <div key={item.id} className="bg-surface-base p-3 rounded-xl border border-border-strong">
                                        <div className="h-24 rounded-lg overflow-hidden bg-surface-highlight mb-2">
                                            {item.image ? (
                                                <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag className="w-6 h-6 text-text-muted" />
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-text-main text-xs line-clamp-2 mb-1">{item.title}</h4>
                                        <p className="text-blue-600 font-bold text-sm">₹{item.price}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Wishlist Events Section */}
                {activeProfileTab === 'about' && (
                    <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong mt-4">
                        <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-4">
                            <h3 className="font-bold text-text-main flex items-center gap-2 text-lg">
                                <Calendar className="w-5 h-5 text-purple-500" /> Saved Events
                            </h3>
                        </div>
                        {wishlistLoading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                            </div>
                        ) : wishlistEvents.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No saved events yet. Explore events to add them!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {wishlistEvents.map((event) => (
                                    <div key={event.id} className="bg-surface-base p-4 rounded-xl border border-border-strong flex gap-4">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-highlight flex-shrink-0">
                                            {event.image ? (
                                                <img src={event.image} className="w-full h-full object-cover" alt={event.title} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-500">
                                                    <Calendar className="w-8 h-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mb-1 inline-block">
                                                    {event.type}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-text-main text-sm line-clamp-1 mb-1">{event.title}</h4>
                                            <div className="text-xs text-text-muted space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {event.date}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {event.location}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Account Settings */}
                <div className="bg-surface-elevated rounded-2xl shadow-sm border border-border-strong overflow-hidden">
                    {/* Real Admin Panel - Only for authorized emails */}
                    {(user?.email === 'yash.harfode.sati@gmail.com' ||
                        user?.email === 'yashharfode123@gmail.com' ||
                        userData?.email === 'yash.harfode.sati@gmail.com' ||
                        userData?.email === 'yashharfode123@gmail.com' ||
                        isDbAdmin) && (
                            <SettingsItem
                                icon={<Shield className="w-5 h-5 text-indigo-600" />}
                                label="Quantum Control"
                                color="text-indigo-600"
                                onClick={() => setActiveTab('quantum')}
                            />
                        )}

                    {userData?.role === 'club_admin' && (
                        <SettingsItem
                            icon={<Shield className="w-5 h-5 text-brand-accent" />}
                            label="Club Command"
                            color="text-brand-accent"
                            onClick={() => setActiveTab('club_command')}
                        />
                    )}

                    <SettingsItem icon={<AlertCircle className="w-5 h-5" />} label="Help & Support" />
                    <SettingsItem
                        icon={<LogOut className="w-5 h-5 text-red-500" />}
                        label="Log Out"
                        color="text-red-500"
                        onClick={() => signOut(auth)}
                    />
                </div>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---
const QuickActionBtn = ({ icon, label, color, onClick }) => (
    <div onClick={onClick} className="flex flex-col md:flex-row items-center md:bg-surface-elevated md:p-3 md:rounded-xl md:shadow-sm md:border md:border-border-strong md:flex-1 gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95">
        <div className={`w-14 h-14 md:w-10 md:h-10 ${color} rounded-full flex items-center justify-center shadow-sm`}>{icon}</div>
        <span className="text-xs font-bold text-text-muted md:text-sm">{label}</span>
    </div>
);

const StatCard = ({ number, label, color = "text-blue-600 bg-blue-50" }) => (
    <div className={`p-4 rounded-2xl text-center bg-surface-elevated shadow-sm border border-border-strong`}>
        <h4 className={`text-2xl font-bold ${color.split(' ')[0]}`}>{number}</h4>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mt-1">{label}</p>
    </div>
);

// Orders View Component (Buyer Side)
const OrdersView = ({ orders, loading, user }) => {
    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return 'Recently';
        try {
            const date = new Date(timestamp.seconds * 1000);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return 'Recently';
        }
    };

    if (loading) {
        return (
            <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                <div className="text-center py-12 text-text-muted">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No orders yet. Start shopping!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <div key={order.id} className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                    <div className="flex items-start gap-4">
                        {order.itemImage && order.itemImage.trim() !== '' ? (
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-elevated flex-shrink-0">
                                <img src={order.itemImage} alt={order.itemTitle} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-8 h-8 text-text-muted" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-text-main text-lg mb-1">{order.itemTitle}</h4>
                                    <p className="text-text-muted text-sm">Seller: {order.sellerName}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {order.status === 'completed' ? 'Completed' : 'Pending Meetup'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-blue-600 font-bold text-xl">₹{order.amount}</span>
                                <span className="text-xs text-text-muted">{formatDate(order.createdAt)}</span>
                            </div>
                            {order.status === 'pending_meetup' && order.deliveryOtp && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <KeyRound className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold text-blue-700 uppercase">Your Delivery OTP</span>
                                    </div>
                                    <div className="text-3xl font-black text-blue-900 tracking-wider mb-2">{order.deliveryOtp}</div>
                                    <p className="text-xs text-blue-800 font-medium">
                                        Share this OTP <span className="font-black">ONLY</span> after you receive the item
                                    </p>
                                    {order.meetupLocation && (
                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                            <div className="flex items-center gap-2 text-xs text-blue-700">
                                                <MapPin className="w-3 h-3" />
                                                <span>{order.meetupLocation}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Pending Sales View Component (Seller Side)
const PendingSalesView = ({ sales, user }) => {
    const [verifyingOtp, setVerifyingOtp] = useState({});
    const [otpInputs, setOtpInputs] = useState({});

    const handleVerifyOTP = async (orderId, enteredOtp) => {
        if (!enteredOtp || enteredOtp.length !== 4) {
            toast.error("Please enter a valid 4-digit OTP");
            return;
        }

        setVerifyingOtp(prev => ({ ...prev, [orderId]: true }));
        try {
            const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
            const orderSnap = await getDoc(orderRef);

            if (!orderSnap.exists()) {
                toast.error("Order not found");
                return;
            }

            const orderData = orderSnap.data();
            if (orderData.deliveryOtp === enteredOtp) {
                // OTP is correct - Complete the order
                await updateDoc(orderRef, {
                    status: 'completed',
                    completedAt: serverTimestamp()
                });

                // Mark item as sold
                const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_items', orderData.itemId);
                await updateDoc(itemRef, {
                    status: 'sold',
                    soldAt: serverTimestamp()
                });

                // Send notification to buyer
                const notificationRef = collection(db, 'artifacts', appId, 'users', orderData.buyerId, 'notifications');
                await addDoc(notificationRef, {
                    type: 'order_completed',
                    orderId,
                    itemTitle: orderData.itemTitle,
                    message: `Your order for "${orderData.itemTitle}" has been completed!`,
                    createdAt: serverTimestamp(),
                    read: false
                });

                toast.success("Order completed successfully! 🎉");
                setOtpInputs(prev => ({ ...prev, [orderId]: '' }));
            } else {
                toast.error("Invalid OTP. Please check and try again.");
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast.error("Failed to verify OTP");
        } finally {
            setVerifyingOtp(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return 'Recently';
        try {
            const date = new Date(timestamp.seconds * 1000);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return 'Recently';
        }
    };

    const pendingSales = sales.filter(s => s.status === 'pending_meetup');

    if (pendingSales.length === 0) {
        return (
            <div className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                <div className="text-center py-12 text-text-muted">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No pending sales. Your completed orders will appear here!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pendingSales.map((order) => (
                <div key={order.id} className="bg-surface-elevated p-6 rounded-2xl shadow-sm border border-border-strong">
                    <div className="flex items-start gap-4 mb-4">
                        {order.itemImage && order.itemImage.trim() !== '' ? (
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-elevated flex-shrink-0">
                                <img src={order.itemImage} alt={order.itemTitle} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-8 h-8 text-text-muted" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-text-main text-lg mb-1">{order.itemTitle}</h4>
                                    <p className="text-text-muted text-sm">Buyer: {order.buyerName}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                    Pending Meetup
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-blue-600 font-bold text-xl">₹{order.amount}</span>
                                <span className="text-xs text-text-muted">{formatDate(order.createdAt)}</span>
                            </div>
                            {order.meetupLocation && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                                    <MapPin className="w-3 h-3" />
                                    <span>{order.meetupLocation}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                        <p className="text-sm text-orange-900 font-medium mb-3">
                            Buyer wants to purchase this item. Meet them and collect payment.
                        </p>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-orange-700 uppercase">Enter OTP from Buyer</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={otpInputs[order.id] || ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setOtpInputs(prev => ({ ...prev, [order.id]: value }));
                                    }}
                                    placeholder="1234"
                                    className="flex-1 bg-surface-elevated border-2 border-orange-300 rounded-lg px-4 py-3 text-2xl font-black text-center tracking-widest focus:outline-none focus:border-orange-500"
                                />
                                <button
                                    onClick={() => handleVerifyOTP(order.id, otpInputs[order.id])}
                                    disabled={verifyingOtp[order.id] || !otpInputs[order.id] || otpInputs[order.id].length !== 4}
                                    className="px-6 bg-green-600 hover:bg-green-700 text-[#111827] font-bold rounded-lg transition disabled:bg-surface-highlight disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {verifyingOtp[order.id] ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Verify
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SettingsItem = ({ icon, label, color = "text-text-muted", onClick }) => (
    <div onClick={onClick} className="flex items-center justify-between p-4 border-b border-border-strong last:border-0 hover:bg-surface-base cursor-pointer transition">
        <div className={`flex items-center gap-3 ${color} font-medium`}>{icon} {label}</div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
    </div>
);

const DesktopNavLink = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${active ? 'bg-blue-600 text-[#111827] shadow-md' : 'text-text-muted hover:bg-blue-50 hover:text-blue-600'}`}>
        {icon} {label}
    </button>
);

const NavBtn = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 -translate-y-1' : 'text-text-muted hover:text-blue-600'}`}>
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

const DrawerNavLink = ({ icon, label, active, onClick, color }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active 
            ? 'bg-blue-600 text-[#111827] shadow-sm' 
            : color || 'text-text-muted hover:bg-surface-elevated hover:text-brand-accent'
    }`}>
        {icon}
        <span>{label}</span>
        {active && <span className="ml-auto w-1.5 h-1.5 bg-surface-elevated rounded-full"></span>}
    </button>
);


// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [isDbAdmin, setIsDbAdmin] = useState(false);
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    const [targetClubId, setTargetClubId] = useState(null);
    const [chatTargetUser, setChatTargetUser] = useState(null);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Check if user is admin from database
    useEffect(() => {
        const checkDbAdmin = async () => {
            if (!user?.email) {
                setIsDbAdmin(false);
                return;
            }

            try {
                const adminsRef = collection(db, 'artifacts', appId, 'admins');
                const snapshot = await getDocs(adminsRef);
                const adminEmails = snapshot.docs.map(doc => doc.data().email);
                setIsDbAdmin(adminEmails.includes(user.email.toLowerCase()));
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsDbAdmin(false);
            }
        };

        checkDbAdmin();
    }, [user?.email]);

    // Fetch User Profile Data
    useEffect(() => {
        if (user) {
            // Correct path with 6 segments
            const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
            const unsub = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    setUserData({ name: 'Student', branch: 'CSE', year: '1st Year', skills: '' });
                }
            }, (error) => console.error("Error fetching profile:", error));
            return () => unsub();
        } else {
            setUserData(null);
        }
    }, [user]);

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-surface-elevated"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    if (!user) {
        return <AuthScreen />;
    }

    // --- DASHBOARD SUB-COMPONENT ---

    return (
        <div className="bg-surface-elevated min-h-screen relative font-sans text-text-main">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between px-8 py-4 bg-surface-base/80 backdrop-blur-md border-b border-border-strong sticky top-0 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                        <img src="/logo.ico" alt="Campify" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-xl font-bold text-text-main">CAMPIFY</h1>
                </div>
                <div className="flex items-center gap-8">
                    <DesktopNavLink icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <DesktopNavLink icon={<ShoppingBag className="w-5 h-5" />} label="Market" active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
                    <DesktopNavLink icon={<FileText className="w-5 h-5" />} label="Notes" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                    <DesktopNavLink icon={<GraduationCap className="w-5 h-5" />} label="Academics" active={activeTab === 'academics'} onClick={() => setActiveTab('academics')} />
                    <DesktopNavLink icon={<MessageSquare className="w-5 h-5" />} label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <DesktopNavLink icon={<Users className="w-5 h-5" />} label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
                    <DesktopNavLink icon={<Compass className="w-5 h-5" />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
                    <DesktopNavLink icon={<Package className="w-5 h-5" />} label="Lost & Found" active={activeTab === 'lost'} onClick={() => setActiveTab('lost')} />
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div onClick={() => setActiveTab('profile')} className="flex items-center gap-2 hover:bg-surface-base p-1.5 rounded-lg transition cursor-pointer">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-elevated">
                            <img
                                src={userData?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.name || 'User'}`}
                                className="w-full h-full object-cover"
                                alt="User"
                            />
                        </div>
                        <span className="text-sm font-bold text-text-muted">{userData?.name || 'Student'}</span>
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-elevated/90 backdrop-blur-md border-b border-border-strong sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('home'); setHamburgerOpen(false); }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                        <img src="/logo.ico" alt="Campify" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-lg font-bold text-text-main">CAMPIFY</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setHamburgerOpen(!hamburgerOpen)}
                        className="p-2 text-text-muted hover:bg-surface-elevated rounded-lg transition-colors focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        <Menu className="w-6 h-6 text-text-main" />
                    </button>
                </div>
            </div>

            {/* Slide Drawer Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${
                    hamburgerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setHamburgerOpen(false)}
            />

            {/* Slide Drawer Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-surface border-l border-border-strong shadow-2xl z-[60] md:hidden flex flex-col transition-transform duration-300 ease-out transform ${
                    hamburgerOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-strong bg-surface-elevated">
                    <span className="text-xs font-bold tracking-widest text-[#2f2a26] uppercase">Navigation</span>
                    <button
                        onClick={() => setHamburgerOpen(false)}
                        className="p-1.5 hover:bg-surface-elevated rounded-full transition-colors text-text-muted"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {/* User Profile Card */}
                <div className="p-5 bg-gradient-to-br bg-surface border-b border-border-strong">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-border-strong bg-surface-elevated shadow-inner shrink-0">
                            <img
                                src={userData?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.name || 'User'}`}
                                className="w-full h-full object-cover"
                                alt="User"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-text-main truncate">{userData?.name || 'Student'}</h4>
                            <p className="text-xs text-text-muted truncate">{user?.email}</p>
                            {(userData?.branch || userData?.year) && (
                                <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wide">
                                    {userData.branch} • {userData.year}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Drawer Nav Links */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <div className="px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Main Pages
                    </div>
                    <DrawerNavLink icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<ShoppingBag className="w-5 h-5" />} label="Market" active={activeTab === 'market'} onClick={() => { setActiveTab('market'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<Users className="w-5 h-5" />} label="Teams" active={activeTab === 'teams'} onClick={() => { setActiveTab('teams'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<Compass className="w-5 h-5" />} label="Discover" active={activeTab === 'discover'} onClick={() => { setActiveTab('discover'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<User className="w-5 h-5" />} label="Profile" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setHamburgerOpen(false); }} />

                    <div className="pt-4 px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Additional Tools
                    </div>
                    <DrawerNavLink icon={<FileText className="w-5 h-5" />} label="Notes" active={activeTab === 'notes'} onClick={() => { setActiveTab('notes'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<GraduationCap className="w-5 h-5" />} label="Academics" active={activeTab === 'academics'} onClick={() => { setActiveTab('academics'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<MessageSquare className="w-5 h-5" />} label="Chat" active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<Package className="w-5 h-5" />} label="Lost & Found" active={activeTab === 'lost'} onClick={() => { setActiveTab('lost'); setHamburgerOpen(false); }} />
                    
                    {(userData?.email === 'yash.harfode.sati@gmail.com' || userData?.email === 'yashharfode123@gmail.com' || isDbAdmin) && (
                        <DrawerNavLink icon={<Shield className="w-5 h-5 text-indigo-600" />} label="Quantum Control" active={activeTab === 'quantum'} onClick={() => { setActiveTab('quantum'); setHamburgerOpen(false); }} />
                    )}
                    
                    {userData?.role === 'club_admin' && (
                        <DrawerNavLink icon={<Shield className="w-5 h-5 text-brand-accent" />} label="Club Command" active={activeTab === 'club_command'} onClick={() => { setTargetClubId(null); setActiveTab('club_command'); setHamburgerOpen(false); }} />
                    )}

                    <div className="pt-4 border-t border-border-strong/50 my-2" />
                    <DrawerNavLink icon={<AlertCircle className="w-5 h-5" />} label="Help & Support" onClick={() => { setHamburgerOpen(false); }} />
                    <DrawerNavLink icon={<LogOut className="w-5 h-5 text-red-500" />} label="Log Out" onClick={() => { setHamburgerOpen(false); signOut(auth); }} color="text-red-500 hover:bg-red-50 hover:text-red-600" />
                </div>
            </div>

            {/* Content Area */}
            <div className="h-full">
                {activeTab === 'home' && <HomeDashboard user={user} userData={userData} setActiveTab={setActiveTab} />}
                {activeTab === 'market' && <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto"><Marketplace user={user} userData={userData} setActiveTab={setActiveTab} setChatTargetUser={setChatTargetUser} /></div>}
                {activeTab === 'teams' && <Teams user={user} userData={userData} setActiveTab={setActiveTab} setChatTargetUser={setChatTargetUser} />}
                {activeTab === 'discover' && <Discover user={user} />}
                {activeTab === 'notes' && <Notes user={user} userData={userData} />}
                {activeTab === 'academics' && <Academics user={user} userData={userData} />}
                {activeTab === 'chat' && <Chat user={user} userData={userData} chatTargetUser={chatTargetUser} setChatTargetUser={setChatTargetUser} />}
                {activeTab === 'lost' && <LostAndFound user={user} userData={userData} />}
                {activeTab === 'profile' && <Profile user={user} userData={userData} setActiveTab={setActiveTab} isDbAdmin={isDbAdmin} />}
                {activeTab === 'quantum' && <Admin user={user} userData={userData} setActiveTab={setActiveTab} setTargetClubId={setTargetClubId} />}
                
                {/* Protected Club Admin Dashboard */}
                {activeTab === 'club_command' && (
                    (userData?.role === 'club_admin' || targetClubId) ? (
                        <ClubAdminDashboard user={user} userData={userData} targetClubId={targetClubId} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-red-500">
                            Access Denied. You are not a club admin.
                            {setTimeout(() => setActiveTab('discover'), 2000) && ""}
                        </div>
                    )
                )}
            </div>

            {/* Mobile Nav */}
            <div className="md:hidden fixed bottom-0 w-full bg-surface-elevated border-t border-border-strong px-6 py-3 flex justify-between items-center z-50 pb-safe shadow-md">
                <NavBtn icon={<Home className="w-6 h-6" />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavBtn icon={<ShoppingBag className="w-6 h-6" />} label="Market" active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
                <NavBtn icon={<Users className="w-6 h-6" />} label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
                <NavBtn icon={<Compass className="w-6 h-6" />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
                <NavBtn icon={<User className="w-6 h-6" />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>

            {/* activeTab === 'home' && <MentorChatBubble /> */}
        </div>
    );
}


