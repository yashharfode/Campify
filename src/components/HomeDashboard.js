'use client';

import React, { useState, useEffect } from 'react';
import { 
    ShoppingBag, Upload, Users, MessageSquare, Calendar, MapPin, 
    GraduationCap, Clock, ChevronRight, X, ExternalLink, TrendingUp, Sparkles, BookOpen 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import SponsoredAds from './SponsoredAds'; // Assuming this exists based on previous code

export default function HomeDashboard({ user, userData, setActiveTab }) {
    const [featuredEvents, setFeaturedEvents] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [scholarshipsLoading, setScholarshipsLoading] = useState(true);
    const [selectedScholarship, setSelectedScholarship] = useState(null);
    const [stats, setStats] = useState({ events: 0, notes: 0, online: Math.floor(Math.random() * 20) + 5 });
    const [greeting, setGreeting] = useState({ text: "Hello", icon: "👋", subText: "Welcome back!" });
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting({ text: "Good Morning", icon: "🌅", subText: "Hope you have an awesome day ahead!" });
        else if (hour >= 12 && hour < 17) setGreeting({ text: "Good Afternoon", icon: "☀️", subText: "Hope your day is going great!" });
        else if (hour >= 17 && hour < 22) setGreeting({ text: "Good Evening", icon: "🌇", subText: "Hope you are having a relaxing evening!" });
        else setGreeting({ text: "Good Night", icon: "🌙", subText: "Burning the midnight oil? Get some rest soon!" });
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch Featured Events
                const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
                const eventsQuery = query(eventsRef, where('featured', '==', true));
                const eventsSnap = await getDocs(eventsQuery);
                const fetchedEvents = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFeaturedEvents(fetchedEvents);

                // Fetch Stats
                const allEventsSnap = await getDocs(eventsRef);
                const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
                const notesSnap = await getDocs(notesRef);
                
                setStats(prev => ({
                    ...prev,
                    events: allEventsSnap.size,
                    notes: notesSnap.size
                }));

                // Fetch Scholarships
                const scholarshipsRef = collection(db, 'artifacts', appId, 'public', 'data', 'scholarships');
                const scholarSnap = await getDocs(scholarshipsRef);
                const fetchedScholarships = scholarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setScholarships(fetchedScholarships);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setInitialLoading(false);
                setScholarshipsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const Skeletons = () => (
        <div className="space-y-8 max-w-7xl mx-auto px-4 pb-24 pt-6 animate-pulse">
            <div className="h-40 bg-surface-elevated/50 rounded-3xl"></div>
            <div className="h-24 bg-surface-elevated/50 rounded-2xl mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-elevated/50 rounded-2xl"></div>)}
            </div>
            <div className="h-6 w-48 bg-surface-elevated/80 rounded mt-12 mb-6"></div>
            <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3].map(i => <div key={i} className="min-w-[300px] h-48 bg-surface-elevated/50 rounded-2xl"></div>)}
            </div>
        </div>
    );

    if (initialLoading) return <Skeletons />;

    return (
        <div className="relative min-h-full pb-12 pt-6 px-4 md:px-6 max-w-7xl mx-auto space-y-8">
            {/* Ambient Lighting System */}
            <div className="absolute top-0 left-10 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="absolute top-40 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            {/* Smart Hero Section */}
            <div className="relative overflow-hidden bg-surface-elevated/60 backdrop-blur-2xl border border-border-strong/30 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-4 group transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(192,132,87,0.2)] hover:border-brand-accent/30 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent pointer-events-none z-0"></div>
                
                <div className="z-10 flex flex-col gap-4">
                    <div>
                        <p className="text-sm md:text-base text-text-muted font-bold tracking-wide uppercase mb-1 flex items-center gap-2">
                            {greeting.text} {greeting.icon}
                        </p>
                        <h1 className="text-3xl md:text-5xl font-black text-text-main mb-2 font-outfit tracking-tight">
                            {userData?.name?.split(' ')[0] || 'Student'} 👋
                        </h1>
                        <p className="text-sm md:text-md text-text-muted max-w-md font-inter leading-relaxed">
                            {greeting.subText}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 bg-brand-accent/10 border border-brand-accent/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                            <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                            <span className="text-xs font-bold text-brand-accent">{stats.events} Active Events</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-bold text-blue-500">{stats.notes} Shared Notes</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-purple-500">{stats.online} Online Now</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 md:mt-0 z-10 relative">
                    <div className="absolute inset-0 bg-brand-accent/20 rounded-full blur-xl group-hover:bg-brand-accent/40 transition-all duration-500"></div>
                    <div 
                        onClick={() => setActiveTab('profile')}
                        className="w-24 h-24 md:w-32 md:h-32 bg-surface-base rounded-full flex items-center justify-center overflow-hidden border-4 border-surface-elevated shadow-lg cursor-pointer relative z-10 transform transition-transform duration-300 hover:scale-105 hover:rotate-3"
                    >
                        {userData?.profileImage ? (
                            <img src={userData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <span className="text-4xl text-brand-accent font-black font-outfit">{userData?.name ? userData.name[0] : 'U'}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Sponsored Ads (Optional, if exists) */}
            <div className="mb-4 mt-2">
                <SponsoredAds />
            </div>

            {/* Smart Quick Actions */}
            <div>
                <h3 className="font-black font-outfit text-xl md:text-2xl text-text-main mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-brand-accent" /> Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickActionTile 
                        icon={<ShoppingBag className="w-8 h-8" />} 
                        title="Market" 
                        desc="Buy & sell essentials"
                        color="text-orange-500" 
                        bg="bg-orange-500"
                        onClick={() => setActiveTab('market')} 
                    />
                    <QuickActionTile 
                        icon={<Upload className="w-8 h-8" />} 
                        title="Notes" 
                        desc="Access study materials"
                        color="text-blue-500" 
                        bg="bg-blue-500"
                        onClick={() => setActiveTab('notes')} 
                    />
                    <QuickActionTile 
                        icon={<Users className="w-8 h-8" />} 
                        title="Teams" 
                        desc="Find your perfect squad"
                        color="text-brand-accent" 
                        bg="bg-brand-accent"
                        onClick={() => setActiveTab('teams')} 
                    />
                    <QuickActionTile 
                        icon={<MessageSquare className="w-8 h-8" />} 
                        title="Chat" 
                        desc="Connect with peers"
                        color="text-purple-500" 
                        bg="bg-purple-500"
                        onClick={() => setActiveTab('chat')} 
                    />
                </div>
            </div>

            {/* Netflix-Style Featured Events */}
            {featuredEvents.length > 0 && (
                <div>
                    <h3 className="font-black font-outfit text-xl md:text-2xl text-text-main mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-pink-500" /> Trending Events
                    </h3>
                    <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        {featuredEvents.map(event => (
                            <div 
                                key={event.id}
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('open-event', { detail: event }));
                                    setActiveTab('discover');
                                }}
                                className="group snap-center min-w-[300px] md:min-w-[400px] aspect-[4/5] md:aspect-[4/3] relative rounded-3xl overflow-hidden cursor-pointer shadow-md transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 border border-border-strong/20 hover:border-white/10"
                            >
                                <div className="absolute inset-0 bg-surface-elevated">
                                    {event.image ? (
                                        <img src={event.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={event.title} />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-brand-accent/20 to-blue-500/20"></div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent group-hover:from-black/100 group-hover:via-black/70 transition-colors duration-500"></div>
                                
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <span className="px-3 py-1.5 rounded-full bg-surface-elevated/20 backdrop-blur-md text-[#111827] text-xs font-bold border border-white/10 uppercase tracking-wide">
                                        {event.category}
                                    </span>
                                    <div className="bg-black/40 backdrop-blur-md text-[#111827] text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {event.date}
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 transform transition-transform duration-500">
                                    <h4 className="font-black font-outfit text-[#111827] text-2xl mb-2 line-clamp-2 leading-tight">
                                        {event.title}
                                    </h4>
                                    <p className="text-text-muted text-sm flex items-center gap-1.5 font-medium mb-0 group-hover:mb-4 transition-all duration-500 opacity-80">
                                        <MapPin className="w-4 h-4" /> {event.location}
                                    </p>
                                    <div className="overflow-hidden max-h-0 group-hover:max-h-20 transition-all duration-500 opacity-0 group-hover:opacity-100">
                                        <div className="w-full py-2.5 bg-brand-accent text-[#111827] rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Scholarships & Opportunities */}
            <div>
                <h3 className="font-black font-outfit text-xl md:text-2xl text-text-main mb-4 flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-brand-accent" /> Scholarships & Opportunities
                </h3>

                {scholarshipsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-surface-elevated/50 rounded-3xl animate-pulse"></div>)}
                    </div>
                ) : scholarships.length === 0 ? (
                    <div className="bg-surface-elevated/50 backdrop-blur-sm p-10 rounded-3xl border border-border-strong text-center border-dashed">
                        <GraduationCap className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
                        <h4 className="font-bold text-text-main text-lg mb-2">No Scholarships Yet</h4>
                        <p className="text-sm text-text-muted">Check back later for life-changing opportunities.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scholarships.map((scholarship) => (
                            <div
                                key={scholarship.id}
                                onClick={() => setSelectedScholarship(scholarship)}
                                className="group relative bg-surface-elevated/80 backdrop-blur-xl border border-border-strong/40 rounded-3xl p-6 transition-all duration-500 hover:shadow-[0_15px_35px_-10px_rgba(192,132,87,0.15)] hover:border-brand-accent/30 cursor-pointer overflow-hidden flex flex-col h-full hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-colors"></div>
                                
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent tracking-wide uppercase">
                                        Scholarship
                                    </span>
                                    {scholarship.deadline && (
                                        <span className="text-xs font-medium text-text-muted flex items-center gap-1.5 bg-surface-highlight px-3 py-1.5 rounded-full">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(scholarship.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                                
                                <h4 className="font-bold font-outfit text-text-main text-xl mb-3 line-clamp-2 leading-tight group-hover:text-brand-accent transition-colors relative z-10 flex-1">
                                    {scholarship.title}
                                </h4>
                                
                                <div className="relative z-10 mt-auto">
                                    {scholarship.provider && (
                                        <p className="text-sm text-text-muted font-medium mb-3">{scholarship.provider}</p>
                                    )}
                                    {scholarship.amount && (
                                        <div className="inline-block bg-green-500/20 border border-green-500/40 px-4 py-2 rounded-xl mb-4">
                                            <p className="text-md font-black text-green-500 tracking-wide">💰 {scholarship.amount}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center text-brand-accent text-sm font-bold group-hover:gap-2 transition-all">
                                        View Details <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Scholarship Detail Modal */}
            {selectedScholarship && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setSelectedScholarship(null)}>
                    <div className="bg-surface-base rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border-strong relative" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-surface-elevated/90 backdrop-blur-xl p-6 md:p-8 border-b border-border-strong z-20">
                            <button onClick={() => setSelectedScholarship(null)} className="absolute top-6 right-6 p-2 bg-surface-highlight hover:bg-border-strong rounded-full transition-colors">
                                <X className="w-5 h-5 text-text-main" />
                            </button>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent mb-4 inline-block tracking-wide uppercase">
                                Scholarship Opportunity
                            </span>
                            <h2 className="text-2xl md:text-3xl font-black font-outfit text-text-main mb-2 leading-tight pr-10">{selectedScholarship.title}</h2>
                            {selectedScholarship.provider && (
                                <p className="text-text-muted font-medium">{selectedScholarship.provider}</p>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 space-y-8 z-10 relative">
                            {/* Amount & Deadline */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedScholarship.amount && (
                                    <div className="bg-green-500/5 border border-green-500/40 rounded-2xl p-5">
                                        <p className="text-xs font-bold text-text-muted uppercase mb-2 tracking-wider">Financial Support</p>
                                        <p className="text-2xl font-black text-green-500">💰 {selectedScholarship.amount}</p>
                                    </div>
                                )}
                                {selectedScholarship.deadline && (
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5">
                                        <p className="text-xs font-bold text-text-muted uppercase mb-2 tracking-wider">Application Deadline</p>
                                        <p className="text-xl font-bold text-orange-500 flex items-center gap-2">
                                            <Calendar className="w-5 h-5" />
                                            {new Date(selectedScholarship.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {selectedScholarship.description && (
                                <div>
                                    <h3 className="font-bold font-outfit text-text-main text-lg mb-3">Overview</h3>
                                    <p className="text-text-muted font-inter leading-relaxed whitespace-pre-wrap">{selectedScholarship.description}</p>
                                </div>
                            )}

                            {/* Eligibility */}
                            {selectedScholarship.eligibility && (
                                <div>
                                    <h3 className="font-bold font-outfit text-text-main text-lg mb-3">Eligibility Criteria</h3>
                                    <div className="bg-surface-highlight border border-border-strong rounded-2xl p-5">
                                        <p className="text-text-muted font-inter leading-relaxed whitespace-pre-wrap">{selectedScholarship.eligibility}</p>
                                    </div>
                                </div>
                            )}

                            {/* Website Link */}
                            {selectedScholarship.website && (
                                <div className="pt-4 pb-4">
                                    <a
                                        href={selectedScholarship.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 bg-brand-accent text-[#111827] px-6 py-4 rounded-2xl font-bold hover:bg-[#386d31] hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                        Visit Official Portal
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for Quick Action Tiles
function QuickActionTile({ icon, title, desc, color, bg, onClick }) {
    return (
        <div 
            onClick={onClick}
            className="group relative bg-surface-elevated/80 backdrop-blur-xl border border-border-strong/40 rounded-3xl p-6 cursor-pointer overflow-hidden shadow-sm transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(192,132,87,0.3)] hover:border-brand-accent/30 hover:-translate-y-2 hover:scale-[1.02]"
        >
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${bg}/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
            
            <div className={`w-14 h-14 rounded-2xl ${bg}/10 border border-${bg}/20 flex items-center justify-center ${color} mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                {icon}
            </div>
            
            <h4 className="font-bold font-outfit text-text-main text-lg mb-1 relative z-10">{title}</h4>
            <p className="text-sm text-text-muted font-inter relative z-10">{desc}</p>
        </div>
    );
}
