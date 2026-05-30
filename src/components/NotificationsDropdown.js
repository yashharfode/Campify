'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, Megaphone, AlertCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';

export default function NotificationsDropdown({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const notifRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(fetched);
            setUnreadCount(fetched.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        if (!user) return;
        const batch = writeBatch(db);
        const unreadNotifs = notifications.filter(n => !n.read);
        
        unreadNotifs.forEach(n => {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { read: true });
        });
        
        await batch.commit().catch(console.error);
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read
        if (!notif.read && user) {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'notifications', notif.id);
            await updateDoc(ref, { read: true }).catch(console.error);
        }

        // Fire custom event to open event modal in Discover page
        if (notif.eventId) {
            window.dispatchEvent(new CustomEvent('open-event', { detail: { id: notif.eventId, clubId: notif.clubId } }));
            // Also need to switch tab to 'discover' if possible. We can fire a global tab switch event.
            window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'discover' }));
        }
        setIsOpen(false);
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        return `${Math.floor(diff/86400)}d ago`;
    };

    const getIcon = (type) => {
        switch (type) {
            case 'NEW_EVENT': return <Megaphone className="w-5 h-5 text-blue-500" />;
            case 'REMINDER': return <Clock className="w-5 h-5 text-orange-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 text-text-muted hover:text-text-main hover:bg-surface-highlight rounded-full transition"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-elevated rounded-2xl shadow-xl border border-border-strong overflow-hidden z-50">
                    <div className="p-4 border-b border-border-strong flex items-center justify-between bg-surface-base">
                        <h3 className="font-bold text-text-main text-lg">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-surface-highlight flex items-center justify-center mb-3">
                                    <Bell className="w-5 h-5 text-text-muted" />
                                </div>
                                <p className="text-text-muted font-medium">No notifications yet</p>
                                <p className="text-sm text-text-muted/60 mt-1">Follow clubs to stay updated!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-strong/50">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 hover:bg-surface-highlight cursor-pointer transition flex items-start gap-3 ${!notif.read ? 'bg-blue-500/5' : ''}`}
                                    >
                                        <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-surface-base border border-blue-500/20' : 'bg-surface-base'}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read ? 'font-bold text-text-main' : 'font-medium text-text-muted'}`}>
                                                {notif.title}
                                            </p>
                                            <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.read ? 'text-text-muted' : 'text-text-muted/70'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-2 font-medium">
                                                {formatTimeAgo(notif.createdAt)}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
