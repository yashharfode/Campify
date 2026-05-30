'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    MessageSquare, Plus, Hash, Send, X, Users, Loader2, Info, Search, User
} from 'lucide-react';
import { 
    collection, query, where, onSnapshot, addDoc, serverTimestamp, 
    orderBy, limit, getDocs, doc, setDoc, getDoc
} from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function Chat({ user, userData, chatTargetUser, setChatTargetUser }) {
    const [sidebarTab, setSidebarTab] = useState('channels'); // 'channels' or 'dms'
    const [activeGroups, setActiveGroups] = useState([]);
    const [activeDms, setActiveDms] = useState([]);
    const [activeGroupId, setActiveGroupId] = useState(null);
    
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    // Request New Group Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);

    // User Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Read Receipts state
    const [readReceipts, setReadReceipts] = useState({});

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const stored = localStorage.getItem('chat_readReceipts');
        if (stored) {
            try {
                setReadReceipts(JSON.parse(stored));
            } catch (err) {}
        }
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const generateDmId = (uid1, uid2) => {
        return [uid1, uid2].sort().join('_');
    };

    const initializeDm = async (targetUser) => {
        if (!user || !targetUser?.uid) return;
        const dmId = generateDmId(user.uid, targetUser.uid);
        
        try {
            const groupRef = doc(db, 'artifacts', appId, 'public', 'data', 'chat_groups', dmId);
            const groupSnap = await getDoc(groupRef);
            
            if (!groupSnap.exists()) {
                await setDoc(groupRef, {
                    type: 'direct',
                    members: [user.uid, targetUser.uid],
                    memberDetails: {
                        [user.uid]: { name: userData?.name || 'User', email: user.email },
                        [targetUser.uid]: { name: targetUser.name, email: targetUser.email || '' }
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            
            setSidebarTab('dms');
            setActiveGroupId(dmId);
            if (setChatTargetUser) setChatTargetUser(null);
        } catch (error) {
            console.error('Error initializing DM:', error);
            toast.error('Failed to start chat');
        }
    };

    // Handle incoming targeted chat routing
    useEffect(() => {
        if (chatTargetUser && user) {
            initializeDm(chatTargetUser);
        }
    }, [chatTargetUser, user]);

    // Fetch and initialize groups (Channels)
    useEffect(() => {
        if (!user) return;

        const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups');
        const q = query(
            groupsRef, 
            where('status', '==', 'active'),
            where('type', '==', 'group')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (snapshot.empty && !loadingGroups) {
                try {
                    const defaults = [
                        { name: 'General Lounge', description: 'Hangout and casual tech talk' },
                        { name: 'Coding Hub', description: 'Share code, debug, and learn' },
                        { name: 'Cybersecurity Cell', description: 'Discussions on sec ops, vulnerabilities, and more' }
                    ];
                    
                    for (const g of defaults) {
                        await addDoc(groupsRef, {
                            name: g.name,
                            description: g.description,
                            createdBy: 'system',
                            status: 'active',
                            type: 'group',
                            createdAt: serverTimestamp(),
                            members: []
                        });
                    }
                } catch (err) {
                    console.error('Failed to initialize default groups:', err);
                }
            } else {
                setActiveGroups(groups.sort((a, b) => a.name.localeCompare(b.name)));
                if (!activeGroupId && groups.length > 0 && sidebarTab === 'channels' && !chatTargetUser) {
                    setActiveGroupId(groups[0].id);
                }
                setLoadingGroups(false);
            }
        });

        getDocs(q).then(snap => {
            if (snap.empty) setLoadingGroups(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch DMs
    useEffect(() => {
        if (!user) return;

        const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups');
        const q = query(
            groupsRef, 
            where('type', '==', 'direct'),
            where('members', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActiveDms(dms.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
        });

        return () => unsubscribe();
    }, [user]);

    // Search Users for DM
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // To avoid complex indexes, fetch all users or use a dedicated users collection if small.
                // In a real prod environment we'd use a cloud function or Algolia. 
                // For Campify, we fetch the first 20 users matching prefix if possible, or client side filter.
                const usersRef = collection(db, 'artifacts', appId, 'users');
                const snapshot = await getDocs(query(usersRef, limit(100)));
                const allUsers = [];
                snapshot.forEach(doc => {
                    if (doc.id !== user.uid) {
                        const data = doc.data().profile?.data || {};
                        if (data.name) {
                            allUsers.push({ uid: doc.id, ...data });
                        }
                    }
                });
                
                const filtered = allUsers.filter(u => 
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                ).slice(0, 10);
                
                setSearchResults(filtered);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(() => {
            searchUsers();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, user]);

    // Fetch messages for active group/dm
    useEffect(() => {
        if (!activeGroupId) return;

        setLoadingMessages(true);
        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups', activeGroupId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs.reverse());
            setLoadingMessages(false);
            
            // Update read receipt for this active group
            if (msgs.length > 0) {
                const latestMsgTime = msgs[msgs.length - 1].timestamp?.toMillis() || Date.now();
                setReadReceipts(prev => {
                    const newReceipts = { ...prev, [activeGroupId]: latestMsgTime };
                    localStorage.setItem('chat_readReceipts', JSON.stringify(newReceipts));
                    return newReceipts;
                });
            }
        });

        return () => unsubscribe();
    }, [activeGroupId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeGroupId || !user) return;

        const msgText = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            const groupRef = doc(db, 'artifacts', appId, 'public', 'data', 'chat_groups', activeGroupId);
            const messagesRef = collection(groupRef, 'messages');
            
            await addDoc(messagesRef, {
                text: msgText,
                senderId: user.uid,
                senderName: userData?.name || 'Anonymous Coder',
                timestamp: serverTimestamp()
            });

            // Update parent updatedAt for sorting DMs
            await setDoc(groupRef, { updatedAt: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setNewMessage(msgText); // restore on fail
        }
    };

    const handleRequestGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim() || !newGroupDesc.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setSubmittingRequest(true);
        try {
            const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_groups');
            await addDoc(groupsRef, {
                name: newGroupName.trim(),
                description: newGroupDesc.trim(),
                createdBy: user.uid,
                status: 'pending',
                type: 'group',
                createdAt: serverTimestamp(),
                members: [user.uid]
            });
            toast.success('Group request submitted to Admin!');
            setIsModalOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
        } catch (error) {
            console.error('Error requesting group:', error);
            toast.error('Failed to request group');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const activeGroupData = activeGroupId ? [...activeGroups, ...activeDms].find(g => g.id === activeGroupId) : null;
    
    const getDmName = (dmData) => {
        if (!dmData || dmData.type !== 'direct') return '';
        const otherUserId = dmData.members.find(m => m !== user.uid);
        return dmData.memberDetails?.[otherUserId]?.name || 'User';
    };

    return (
        <div className="bg-surface-elevated/50 backdrop-blur-3xl h-[calc(100vh-100px)] rounded-3xl border border-border-strong overflow-hidden flex flex-col md:flex-row text-text-main font-sans shadow-2xl relative z-10">
            
            {/* Sidebar */}
            <div className="w-full md:w-80 bg-surface-base/40 backdrop-blur-xl border-r border-border-strong flex flex-col h-full flex-shrink-0 z-20">
                <div className="flex p-3 gap-2">
                    <button 
                        onClick={() => setSidebarTab('channels')}
                        className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${sidebarTab === 'channels' ? 'bg-surface-elevated shadow-sm text-text-main' : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'}`}
                    >
                        Channels
                    </button>
                    <button 
                        onClick={() => setSidebarTab('dms')}
                        className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${sidebarTab === 'dms' ? 'bg-surface-elevated shadow-sm text-text-main' : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'}`}
                    >
                        Direct Messages
                    </button>
                </div>
                
                {sidebarTab === 'channels' ? (
                    <>
                        <div className="px-5 py-3 flex justify-between items-center">
                            <h2 className="font-extrabold text-xs text-text-muted uppercase tracking-wider">All Channels</h2>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="p-1.5 hover:bg-surface-highlight rounded-lg transition text-text-muted hover:text-text-main focus:outline-none"
                                title="Request New Channel"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-1 custom-scrollbar">
                            {loadingGroups ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-brand-accent" /></div>
                            ) : activeGroups.length === 0 ? (
                                <div className="h-32 flex items-center justify-center">
                                    <p className="text-sm text-text-muted text-center">No active channels.</p>
                                </div>
                            ) : (
                                activeGroups.map(group => {
                                    const isUnread = group.updatedAt && activeGroupId !== group.id && (group.updatedAt.toMillis() > (readReceipts[group.id] || 0));
                                    const isActive = activeGroupId === group.id;
                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => setActiveGroupId(group.id)}
                                            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all duration-200 group ${
                                                isActive 
                                                    ? 'bg-brand-accent/10 text-brand-accent shadow-sm border border-brand-accent/20' 
                                                    : 'text-text-muted hover:bg-surface-highlight hover:text-text-main border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Hash className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-brand-accent' : 'text-text-muted group-hover:text-text-main'}`} />
                                                <span className={`font-semibold truncate text-sm ${isUnread && !isActive ? 'text-text-main font-bold' : ''} ${isActive ? 'text-text-main' : ''}`}>{group.name}</span>
                                            </div>
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0 animate-pulse"></div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="px-4 py-3">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-text-muted group-focus-within:text-brand-accent transition-colors" />
                                </div>
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users..."
                                    className="block w-full pl-10 pr-3 py-2.5 bg-surface-elevated border border-border-strong rounded-2xl text-sm placeholder:text-text-muted focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent outline-none transition-all shadow-sm"
                                />
                            </div>
                            
                            {searchQuery.trim().length >= 2 && (
                                <div className="absolute z-30 mt-2 w-[calc(100%-32px)] bg-surface-elevated/95 backdrop-blur-xl border border-border-strong rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden max-h-60 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-accent" /></div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-text-muted">No users found</div>
                                    ) : (
                                        searchResults.map(resUser => (
                                            <button
                                                key={resUser.uid}
                                                onClick={() => {
                                                    initializeDm(resUser);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full text-left p-3 hover:bg-surface-highlight transition flex items-center gap-3 border-b border-border-strong last:border-0"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-surface-highlight flex items-center justify-center text-text-muted text-sm font-bold border border-border-strong">
                                                    {resUser.name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <p className="text-sm font-bold text-text-main truncate">{resUser.name}</p>
                                                    <p className="text-xs text-text-muted truncate">{resUser.email || 'Student'}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-1 custom-scrollbar">
                            {activeDms.length === 0 ? (
                                <div className="h-32 flex items-center justify-center px-4">
                                    <p className="text-sm text-text-muted text-center leading-relaxed">Search for a student to start a direct message.</p>
                                </div>
                            ) : (
                                activeDms.map(dm => {
                                    const dmName = getDmName(dm);
                                    const isUnread = dm.updatedAt && activeGroupId !== dm.id && (dm.updatedAt.toMillis() > (readReceipts[dm.id] || 0));
                                    const isActive = activeGroupId === dm.id;
                                    return (
                                        <button
                                            key={dm.id}
                                            onClick={() => setActiveGroupId(dm.id)}
                                            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all duration-200 group ${
                                                isActive 
                                                    ? 'bg-brand-accent/10 text-brand-accent shadow-sm border border-brand-accent/20' 
                                                    : 'text-text-muted hover:bg-surface-highlight hover:text-text-main border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${isActive ? 'bg-brand-accent text-white shadow-md' : 'bg-surface-highlight border border-border-strong text-text-muted group-hover:text-text-main'}`}>
                                                    {dmName.charAt(0)}
                                                </div>
                                                <span className={`font-semibold truncate text-sm ${isUnread && !isActive ? 'text-text-main font-bold' : ''} ${isActive ? 'text-text-main' : ''}`}>{dmName}</span>
                                            </div>
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0 animate-pulse"></div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-transparent relative">
                
                {/* Frosted Glass Header */}
                {activeGroupData ? (
                    <div className="absolute top-0 inset-x-0 z-30 p-4 border-b border-border-strong bg-surface-elevated/70 backdrop-blur-2xl flex justify-between items-center transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-surface-highlight border border-border-strong flex items-center justify-center">
                                {activeGroupData.type === 'direct' ? (
                                    <User className="w-5 h-5 text-text-main" />
                                ) : (
                                    <Hash className="w-5 h-5 text-text-main" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-extrabold text-text-main text-lg leading-none">
                                    {activeGroupData.type === 'direct' ? getDmName(activeGroupData) : activeGroupData.name}
                                </h3>
                                {activeGroupData.type !== 'direct' && (
                                    <p className="text-xs text-text-muted mt-1 truncate max-w-sm font-medium">{activeGroupData.description}</p>
                                )}
                            </div>
                        </div>
                        {activeGroupData.type !== 'direct' && (
                            <div className="flex items-center gap-2 text-text-muted bg-surface-highlight/50 px-3 py-1.5 rounded-xl border border-border-strong/50 backdrop-blur-md">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-bold">{activeGroupData.members?.length || 0}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="absolute top-0 inset-x-0 z-30 p-4 h-[73px] bg-transparent"></div>
                )}

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-24 pb-4 space-y-6 custom-scrollbar z-10 relative">
                    {loadingMessages ? (
                        <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-brand-accent" /></div>
                    ) : !activeGroupId ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted max-w-sm mx-auto text-center space-y-4">
                            <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center shadow-inner">
                                <MessageSquare className="w-8 h-8 text-text-muted" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-main mb-1">Your Messages</h3>
                                <p className="text-sm">Select a channel or conversation from the sidebar to start chatting with your peers.</p>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-4">
                            <div className="p-4 bg-surface-highlight rounded-full border border-border-strong">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium">This is the beginning of the chat history.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === user?.uid;
                            const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                            
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                                    {showHeader && (
                                        <div className={`text-xs font-bold text-text-muted mb-1.5 px-1 flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isMe && (
                                                <div className="w-6 h-6 rounded-full bg-surface-highlight border border-border-strong flex items-center justify-center text-[10px] text-text-main font-bold shadow-sm">
                                                    {msg.senderName?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            {isMe ? 'You' : msg.senderName}
                                        </div>
                                    )}
                                    <div className={`px-5 py-3 max-w-[85%] md:max-w-[70%] text-sm leading-relaxed shadow-sm ${
                                        isMe 
                                            ? 'bg-brand-accent text-white rounded-2xl rounded-tr-sm' 
                                            : 'bg-surface-elevated border border-border-strong text-text-main rounded-2xl rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Premium AI-Style Message Input */}
                {activeGroupId && (
                    <div className="p-4 pb-6 bg-gradient-to-t from-surface-elevated via-surface-elevated/95 to-transparent z-20 flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-accent/20 to-brand-accent/10 rounded-[28px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                            <div className="relative flex items-end gap-2 bg-surface-elevated border border-border-strong rounded-[24px] p-2 shadow-sm focus-within:shadow-md transition-shadow">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder={activeGroupData?.type === 'direct' ? `Message ${getDmName(activeGroupData)}...` : `Message #${activeGroupData?.name}...`}
                                    className="flex-1 bg-transparent max-h-32 min-h-[44px] px-4 py-3 text-sm text-text-main placeholder:text-text-muted outline-none resize-none custom-scrollbar"
                                    rows="1"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-brand-accent hover:bg-brand-accent-hover disabled:bg-surface-highlight disabled:text-text-muted text-white w-11 h-11 rounded-[18px] transition-all flex items-center justify-center flex-shrink-0 shadow-sm disabled:shadow-none"
                                >
                                    <Send className="w-5 h-5 ml-0.5" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Request Group Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-surface-base/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-surface-elevated border border-border-strong rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border-strong bg-surface-base/50 flex justify-between items-center">
                            <h3 className="font-extrabold text-text-main text-lg flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-brand-accent" />
                                </div>
                                Request Channel
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-highlight hover:text-text-main transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleRequestGroup} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Channel Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Competitive Programming"
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    required
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="What is this channel about?"
                                    rows="3"
                                    className="w-full bg-surface-highlight border border-border-strong text-text-main rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent outline-none resize-none transition-all"
                                />
                            </div>

                            <div className="flex items-start gap-3 bg-brand-accent/10 p-4 rounded-xl border border-brand-accent/20">
                                <Info className="w-5 h-5 text-brand-accent mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Your request will be sent to the Admin team for review. Once approved, it will become an official channel for all students.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-bold text-text-muted hover:text-text-main bg-surface-highlight hover:bg-border-strong transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest || !newGroupName.trim() || !newGroupDesc.trim()}
                                    className="flex-1 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-surface-highlight disabled:text-text-muted text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {submittingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
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

