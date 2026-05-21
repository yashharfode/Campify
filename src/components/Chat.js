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
        <div className="bg-[#1A1A1A] h-[calc(100vh-100px)] rounded-2xl border border-[#333] overflow-hidden flex flex-col md:flex-row text-[#E0E0E0] font-sans">
            
            {/* Sidebar */}
            <div className="w-full md:w-72 bg-[#1A1A1A] border-r border-[#333] flex flex-col h-full flex-shrink-0">
                <div className="flex bg-[#242424] border-b border-[#333]">
                    <button 
                        onClick={() => setSidebarTab('channels')}
                        className={`flex-1 py-3 text-sm font-bold transition ${sidebarTab === 'channels' ? 'text-[#2D5A27] border-b-2 border-[#2D5A27]' : 'text-[#888] hover:text-[#bbb]'}`}
                    >
                        Channels
                    </button>
                    <button 
                        onClick={() => setSidebarTab('dms')}
                        className={`flex-1 py-3 text-sm font-bold transition ${sidebarTab === 'dms' ? 'text-[#2D5A27] border-b-2 border-[#2D5A27]' : 'text-[#888] hover:text-[#bbb]'}`}
                    >
                        Direct Messages
                    </button>
                </div>
                
                {sidebarTab === 'channels' ? (
                    <>
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#1A1A1A]">
                            <h2 className="font-bold text-sm text-[#888] uppercase tracking-wider">All Channels</h2>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="p-1.5 hover:bg-[#333] rounded-lg transition text-[#A0A0A0] hover:text-white"
                                title="Request New Channel"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                            {loadingGroups ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-[#2D5A27]" /></div>
                            ) : activeGroups.length === 0 ? (
                                <p className="text-sm text-[#666] text-center p-4">No active channels.</p>
                            ) : (
                                activeGroups.map(group => {
                                    const isUnread = group.updatedAt && activeGroupId !== group.id && (group.updatedAt.toMillis() > (readReceipts[group.id] || 0));
                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => setActiveGroupId(group.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition ${
                                                activeGroupId === group.id 
                                                    ? 'bg-[#2D5A27]/20 text-white border border-[#2D5A27]/30' 
                                                    : 'text-[#A0A0A0] hover:bg-[#242424] hover:text-white border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Hash className={`w-4 h-4 flex-shrink-0 ${activeGroupId === group.id ? 'text-[#2D5A27]' : 'text-[#666]'}`} />
                                                <span className={`font-medium truncate text-sm ${isUnread ? 'text-white font-bold' : ''}`}>{group.name}</span>
                                            </div>
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-[#2D5A27] flex-shrink-0"></div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 border-b border-[#333] bg-[#1A1A1A]">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666]" />
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users to chat..."
                                    className="w-full bg-[#242424] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#666] focus:ring-1 focus:ring-[#2D5A27] outline-none"
                                />
                            </div>
                            
                            {searchQuery.trim().length >= 2 && (
                                <div className="absolute z-10 mt-1 w-[calc(100%-24px)] bg-[#242424] border border-[#333] rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-[#2D5A27] mx-auto" /></div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-[#888]">No users found</div>
                                    ) : (
                                        searchResults.map(resUser => (
                                            <button
                                                key={resUser.uid}
                                                onClick={() => {
                                                    initializeDm(resUser);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full text-left p-3 hover:bg-[#333] transition flex items-center gap-3 border-b border-[#333] last:border-0"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] text-xs border border-[#333]">
                                                    {resUser.name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-medium text-white truncate">{resUser.name}</p>
                                                    <p className="text-xs text-[#666] truncate">{resUser.email || 'Student'}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                            {activeDms.length === 0 ? (
                                <p className="text-sm text-[#666] text-center p-4 mt-4">Search for a user to start a conversation.</p>
                            ) : (
                                activeDms.map(dm => {
                                    const dmName = getDmName(dm);
                                    const isUnread = dm.updatedAt && activeGroupId !== dm.id && (dm.updatedAt.toMillis() > (readReceipts[dm.id] || 0));
                                    return (
                                        <button
                                            key={dm.id}
                                            onClick={() => setActiveGroupId(dm.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition ${
                                                activeGroupId === dm.id 
                                                    ? 'bg-[#2D5A27]/20 text-white border border-[#2D5A27]/30' 
                                                    : 'text-[#A0A0A0] hover:bg-[#242424] hover:text-white border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[10px] text-[#A0A0A0] flex-shrink-0">
                                                    {dmName.charAt(0)}
                                                </div>
                                                <span className={`font-medium truncate text-sm ${isUnread ? 'text-white font-bold' : ''}`}>{dmName}</span>
                                            </div>
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-[#2D5A27] flex-shrink-0"></div>
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
            <div className="flex-1 flex flex-col h-full bg-[#1A1A1A]">
                {/* Chat Header */}
                {activeGroupData ? (
                    <div className="p-4 border-b border-[#333] bg-[#242424] flex justify-between items-center flex-shrink-0">
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                {activeGroupData.type === 'direct' ? (
                                    <User className="w-5 h-5 text-[#666]" />
                                ) : (
                                    <Hash className="w-5 h-5 text-[#666]" />
                                )}
                                {activeGroupData.type === 'direct' ? getDmName(activeGroupData) : activeGroupData.name}
                            </h3>
                            {activeGroupData.type !== 'direct' && (
                                <p className="text-xs text-[#888] mt-0.5 truncate max-w-md">{activeGroupData.description}</p>
                            )}
                        </div>
                        {activeGroupData.type !== 'direct' && (
                            <div className="flex items-center gap-2 text-[#888] bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#333]">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-bold">{activeGroupData.members?.length || 0}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 border-b border-[#333] bg-[#242424] h-[73px]"></div>
                )}

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {loadingMessages ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#2D5A27]" /></div>
                    ) : !activeGroupId ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#666]">
                            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                            <p>Select a channel or conversation to start chatting</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#666]">
                            <p>No messages yet. Say hello!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === user?.uid;
                            const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                            
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {showHeader && (
                                        <span className="text-xs font-bold text-[#888] mb-1 px-1 flex items-center gap-1.5">
                                            {!isMe && (
                                                <div className="w-4 h-4 rounded-full bg-[#333] flex items-center justify-center text-[8px] text-[#A0A0A0]">
                                                    {msg.senderName?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            {isMe ? 'You' : msg.senderName}
                                        </span>
                                    )}
                                    <div className={`px-4 py-2.5 max-w-[75%] rounded-2xl text-sm ${
                                        isMe 
                                            ? 'bg-[#2D5A27] text-white rounded-tr-sm' 
                                            : 'bg-[#242424] border border-[#333] text-[#E0E0E0] rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {activeGroupId && (
                    <div className="p-4 bg-[#242424] border-t border-[#333] flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={activeGroupData?.type === 'direct' ? `Message ${getDmName(activeGroupData)}...` : `Message #${activeGroupData?.name}...`}
                                className="flex-1 bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent text-white placeholder-[#666] outline-none transition"
                            />
                            <button 
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-[#2D5A27] hover:bg-[#386d31] disabled:bg-[#333] disabled:text-[#666] text-white px-4 py-2 rounded-xl transition flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Request Group Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-[#333] bg-[#242424] flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#2D5A27]" /> Request New Channel
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleRequestGroup} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#888] uppercase mb-1.5">Channel Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Competitive Programming"
                                    className="w-full bg-[#242424] border border-[#333] text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2D5A27] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#888] uppercase mb-1.5">Description *</label>
                                <textarea
                                    required
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="What is this channel about?"
                                    rows="3"
                                    className="w-full bg-[#242424] border border-[#333] text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#2D5A27] outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-start gap-2 bg-[#2D5A27]/10 p-3 rounded-lg border border-[#2D5A27]/30">
                                <Info className="w-4 h-4 text-[#2D5A27] mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-[#A0A0A0] leading-relaxed">
                                    Your request will be sent to the Super Admin for approval. Once approved, it will appear in the Channels list for everyone.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-[#A0A0A0] hover:text-white hover:bg-[#333] transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest || !newGroupName.trim() || !newGroupDesc.trim()}
                                    className="flex-1 bg-[#2D5A27] hover:bg-[#386d31] disabled:bg-[#333] disabled:text-[#666] text-white py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                                >
                                    {submittingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
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
                    background-color: #333;
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: #444;
                }
            `}</style>
        </div>
    );
}

