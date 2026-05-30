'use client';

import React, { useState, useEffect, useRef } from 'react';
import HomeDashboard from '../../components/HomeDashboard';
import {
    Mail, Lock, Eye, EyeOff, Activity, Trophy, Tent, BarChart3, Home, ShoppingBag, Users, Compass, User, Search, Bell, Plus, Heart, Upload,
    AlertCircle, Calendar, Download, Github, Linkedin, Filter, Menu, Settings,
    LogOut, ChevronRight, MapPin, Music, Code, Mic, Lightbulb,
    Edit3, ShieldCheck, ToggleRight, Briefcase, X, Megaphone, Loader2, Save, Camera,
    Link as LinkIcon, ExternalLink, CheckCircle2, Package, CreditCard, KeyRound, Layers,
    Shield, Database, Server, Clock, FileText, GraduationCap, MessageSquare
} from 'lucide-react';
import { useBranches } from '../../lib/useBranches';

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
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
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
            if (error.code === 'auth/popup-closed-by-user') {
                // Silently ignore popup closed by user
                return;
            }
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
        <div className="min-h-screen bg-surface-base flex overflow-hidden">
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                @keyframes float-fast {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(-3deg); }
                }
                @keyframes particle-drift {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
                }
                .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
                .animate-float-fast { animation: float-fast 5s ease-in-out infinite; }
            `}</style>

            {/* Left Section (55%) - Hidden on mobile */}
            <div className="hidden lg:flex w-[55%] relative bg-background border-r border-border-strong items-center justify-center overflow-hidden">
                {/* Layer 4: Gradient Spotlight */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

                {/* Layer 3: Particles */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div 
                            key={i} 
                            className="absolute w-2 h-2 bg-brand-accent rounded-full opacity-0"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `particle-drift ${10 + Math.random() * 20}s linear infinite`,
                                animationDelay: `-${Math.random() * 20}s`
                            }}
                        />
                    ))}
                </div>

                {/* Main Content Group */}
                <div className="relative z-10 flex flex-col items-center">
                    {/* Typography */}
                    <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <h1 className="text-6xl font-black text-text-main mb-4 tracking-tight">Welcome <span className="text-brand-accent">Back!</span></h1>
                        <p className="text-lg text-text-muted font-medium">Glad to see you again.<br/>Login to continue your journey.</p>
                    </div>

                    {/* Image & Glassmorphism Elements */}
                    <div className="relative">
                        {/* Layer 1: Character */}
                        <img 
                            src="/images/coder.png" 
                            alt="Student working on laptop" 
                            className="w-[500px] h-auto object-contain drop-shadow-2xl animate-float-slow"
                        />

                        {/* Layer 2: Glassmorphism Floating Elements */}
                        <div className="absolute -top-4 -left-12 bg-surface-elevated/70 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-float-fast">
                            <Trophy className="w-8 h-8 text-brand-accent" />
                        </div>
                        <div 
                            className="absolute top-1/4 -right-16 bg-surface-elevated/70 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-float-slow"
                            style={{ animationDelay: '1s' }}
                        >
                            <Shield className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div 
                            className="absolute bottom-1/4 -left-8 bg-surface-elevated/70 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-float-fast"
                            style={{ animationDelay: '2s' }}
                        >
                            <Tent className="w-8 h-8 text-blue-500" />
                        </div>
                        <div 
                            className="absolute bottom-12 -right-4 bg-surface-elevated/70 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-float-slow"
                            style={{ animationDelay: '1.5s' }}
                        >
                            <BarChart3 className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section (45% Desktop, 100% Mobile) */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                    {/* Compact Hero for Mobile Only */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-20 h-20 mx-auto bg-brand-accent/10 rounded-full flex items-center justify-center mb-4">
                            <img src="/logo.ico" alt="Campify" className="w-12 h-12 object-contain" />
                        </div>
                        <h1 className="text-3xl font-black text-text-main mb-2">Welcome Back!</h1>
                        <p className="text-text-muted">Login to continue your journey.</p>
                    </div>

                    {/* Premium Auth Card */}
                    <div className="bg-surface-elevated border border-border-strong rounded-3xl p-8 shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.3)]">
                        <div className="text-center mb-8 hidden lg:block">
                            <div className="w-12 h-12 bg-surface-base border border-border-strong rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Lock className="w-6 h-6 text-brand-accent" />
                            </div>
                            <h2 className="text-2xl font-bold text-text-main">Login to your account</h2>
                            <p className="text-sm text-text-muted mt-1">Enter your details below</p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-surface-base p-1 rounded-xl mb-8 border border-border-subtle">
                            <button
                                onClick={() => switchMode('login')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-surface-elevated text-brand-accent shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => switchMode('signup')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'signup' ? 'bg-surface-elevated text-brand-accent shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form onSubmit={handleEmailAuth} className="space-y-5">
                            {mode === 'signup' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-main ml-1">First Name</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-surface-base border border-border-strong rounded-xl p-3 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                                placeholder="Alex"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-main ml-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-surface-base border border-border-strong rounded-xl p-3 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                                placeholder="Sharma"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-main ml-1">Username</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-text-muted" />
                                            </div>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-surface-base border border-border-strong rounded-xl p-3 pl-10 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                                placeholder="uniqueusername"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-main ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-text-muted group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-surface-base border border-border-strong rounded-xl p-3 pl-10 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-main ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-text-muted group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-surface-base border border-border-strong rounded-xl p-3 pl-10 pr-10 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                        placeholder="Enter your password"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {mode === 'signup' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-main ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-text-muted group-focus-within:text-brand-accent transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-surface-base border border-border-strong rounded-xl p-3 pl-10 pr-10 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                            placeholder="Confirm your password"
                                        />
                                    </div>
                                </div>
                            )}

                            {mode === 'login' && (
                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-brand-accent border-brand-accent text-white' : 'border-border-strong bg-surface-base group-hover:border-brand-accent'}`}>
                                            {rememberMe && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className="text-xs font-medium text-text-muted group-hover:text-text-main transition-colors">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordEmail(email);
                                            setForgotPasswordOpen(true);
                                        }}
                                        className="text-xs font-bold text-brand-accent hover:text-brand-accent-hover transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-accent hover:bg-brand-accent-hover text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(192,132,87,0.39)] transition-all transform hover:-translate-y-[1px] active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Login' : 'Create Account')}
                            </button>
                        </form>

                        <div className="my-6 relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-strong"></div>
                            </div>
                            <span className="relative px-4 bg-surface-elevated text-xs font-medium text-text-muted uppercase tracking-wider">or continue with</span>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleGoogleAuth}
                                className="w-full bg-surface-base border border-border-strong text-text-main font-bold py-3.5 rounded-xl hover:bg-surface-highlight hover:border-brand-accent/50 transition-all flex items-center justify-center gap-3 shadow-sm group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.61 20.083H42V20H24v8h11.303C34.125 31.617 29.598 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.659 5.009 29.082 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.39-3.917z" /><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.077 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.659 5.009 29.082 3 24 3c-7.938 0-14.68 4.632-17.694 11.691z" /><path fill="#4CAF50" d="M24 43c5.522 0 10.508-2.115 14.167-5.564l-6.506-5.506C29.64 34.318 26.929 35 24 35c-5.564 0-10.279-3.559-11.957-8.483l-6.6 5.086C8.434 38.419 15.62 43 24 43z" /><path fill="#1976D2" d="M43.61 20.083H42V20H24v8h11.303C34.732 31.135 30.251 35 24 35c-5.564 0-10.279-3.559-11.957-8.483l-6.6 5.086C8.434 38.419 15.62 43 24 43c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.39-3.917z" /></svg>
                                Google
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {forgotPasswordOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-elevated rounded-2xl w-full max-w-md p-8 shadow-2xl border border-border-strong animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-text-main">Reset Password</h3>
                            <button onClick={() => setForgotPasswordOpen(false)} className="text-text-muted hover:text-text-main"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-main ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={forgotPasswordEmail}
                                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                    className="w-full bg-surface-base border border-border-strong rounded-xl p-3 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all placeholder:text-text-muted"
                                    placeholder="Enter your registered email"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setForgotPasswordOpen(false)} className="flex-1 bg-surface-base text-text-main font-bold py-3 rounded-xl border border-border-strong hover:bg-surface-highlight transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold py-3 rounded-xl shadow-md transition-all">Send Link</button>
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
    const { branches: BRANCHES, loadingBranches } = useBranches();
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
                                <select
                                    name="branch"
                                    value={formData.branch || ''}
                                    onChange={handleChange}
                                    className="w-1/2 bg-surface-base border border-border-subtle rounded-lg py-2 px-3 text-text-main text-sm text-center focus:outline-none focus:border-[#C08457]"
                                >
                                    <option value="" disabled>Select Branch</option>
                                    {!loadingBranches && BRANCHES.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
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
            : color || 'text-text-main hover:bg-surface-elevated hover:text-brand-accent'
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
                <div className="flex items-center gap-6">
                    <DesktopNavLink icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <DesktopNavLink icon={<Compass className="w-5 h-5" />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
                    <DesktopNavLink icon={<GraduationCap className="w-5 h-5" />} label="Academics" active={activeTab === 'academics'} onClick={() => setActiveTab('academics')} />
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
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-surface-elevated bg-opacity-100 backdrop-blur-none border-l border-border-strong shadow-2xl z-[60] md:hidden flex flex-col transition-transform duration-300 ease-out transform ${
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
                <NavBtn icon={<Compass className="w-6 h-6" />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
                <NavBtn icon={<MessageSquare className="w-6 h-6" />} label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                <NavBtn icon={<User className="w-6 h-6" />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>

            {/* activeTab === 'home' && <MentorChatBubble /> */}
        </div>
    );
}


