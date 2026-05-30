'use client';

import React, { useState, useEffect } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { Trophy, Medal, Star, Flame, Loader2, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Leaderboard({ user, userData }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                // Fetch all profiles. In a production app with thousands of users, 
                // this would be a paginated query with a composite index.
                // For this prototype, fetching all and sorting client-side is fine.
                const profilesQuery = collectionGroup(db, 'profile');
                const snapshot = await getDocs(profilesQuery);
                
                const allUsers = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (doc.id === 'data' && data.uid) {
                        if (data.hideFromLeaderboard || (data.karma || 0) <= 0) return; // SuperAdmin stealth mode or zero karma
                        
                        allUsers.push({
                            uid: data.uid,
                            name: data.name || 'Anonymous',
                            branch: data.branch || 'Unknown',
                            email: data.email || '',
                            karma: data.karma || 0,
                            profileImage: data.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name || 'Anonymous'}`
                        });
                    }
                });

                // Sort by karma descending
                const sortedLeaders = allUsers.sort((a, b) => b.karma - a.karma).slice(0, 50);
                setLeaders(sortedLeaders);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
                toast.error("Failed to load leaderboard");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaders();
    }, []);

    const getRankIcon = (index) => {
        if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
        if (index === 2) return <Medal className="w-6 h-6 text-orange-600" />;
        return <span className="text-text-muted font-bold w-6 text-center">{index + 1}</span>;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24">
            <div className="bg-gradient-to-r from-orange-500/20 to-brand-accent/20 border border-orange-500/30 rounded-3xl p-8 mb-8 text-center relative overflow-hidden shadow-lg">
                <div className="absolute -top-10 -right-10 opacity-10">
                    <Trophy className="w-48 h-48 text-orange-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-text-main mb-4 tracking-tight relative z-10 flex items-center justify-center gap-3">
                    <Flame className="w-10 h-10 text-orange-500" /> Campus Legends
                </h1>
                <p className="text-lg text-text-muted relative z-10 font-medium max-w-2xl mx-auto">
                    Earn Karma by uploading notes and answering questions in the forums. 
                    The top 50 students will be featured on the Campus Leaderboard!
                </p>
                
                {userData && (
                    <div className="mt-8 inline-flex items-center gap-4 bg-surface-elevated/80 backdrop-blur-md px-6 py-3 rounded-full border border-border-strong relative z-10 shadow-sm">
                        <img src={userData.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`} alt="You" className="w-10 h-10 rounded-full bg-surface-highlight border-2 border-brand-accent" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Karma</p>
                            <p className="text-xl font-black text-brand-accent flex items-center gap-1">
                                {userData.karma || 0} <ArrowUpCircle className="w-4 h-4" />
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-surface-elevated rounded-3xl shadow-sm border border-border-strong overflow-hidden">
                <div className="p-6 border-b border-border-strong bg-surface-base">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" /> Top Students
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
                    </div>
                ) : leaders.length === 0 ? (
                    <div className="text-center py-16">
                        <Flame className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-text-main mb-2">No legends yet</h3>
                        <p className="text-text-muted">Upload some notes to be the first on the leaderboard!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-strong/50">
                        {leaders.map((leader, index) => {
                            const isCurrentUser = user && leader.uid === user.uid;
                            return (
                                <div 
                                    key={leader.uid} 
                                    className={`flex items-center gap-4 p-5 transition-colors ${
                                        isCurrentUser ? 'bg-brand-accent/5 hover:bg-brand-accent/10' : 'hover:bg-surface-highlight'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-8 flex-shrink-0">
                                        {getRankIcon(index)}
                                    </div>
                                    <img 
                                        src={leader.profileImage} 
                                        alt={leader.name} 
                                        className={`w-12 h-12 rounded-xl flex-shrink-0 object-cover ${
                                            index === 0 ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-surface-elevated' :
                                            index === 1 ? 'ring-2 ring-gray-400 ring-offset-2 ring-offset-surface-elevated' :
                                            index === 2 ? 'ring-2 ring-orange-600 ring-offset-2 ring-offset-surface-elevated' : ''
                                        }`} 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-text-main truncate flex flex-wrap items-center gap-2">
                                            {leader.name}
                                            {isCurrentUser && <span className="text-[10px] bg-brand-accent text-[#111827] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">You</span>}
                                            {['yash.harfode.sati@gmail.com', 'yashharfode123@gmail.com'].includes(leader.email) && (
                                                <span className="text-[10px] bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                    <Flame className="w-3 h-3" /> Ultra Legend
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-text-muted">{leader.branch}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="inline-flex items-center gap-1.5 bg-surface-base px-3 py-1.5 rounded-lg border border-border-strong shadow-sm">
                                            <Flame className={`w-4 h-4 ${index < 3 ? 'text-orange-500' : 'text-text-muted'}`} />
                                            <span className="font-black text-text-main">{leader.karma}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
