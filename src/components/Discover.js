'use client';

import React, { useState, useEffect } from 'react';
import {
    Search, Clock, MapPin, Users, Calendar, ExternalLink,
    Sparkles, TrendingUp, Heart, Share2, Zap, BookOpen,
    Music, Palette, Code, Trophy, Globe, Lightbulb, X, Image as ImageIcon, ArrowLeft, Instagram, Linkedin, Mail, Phone, Layers
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import toast from 'react-hot-toast';
import { getOptimizedImageUrl } from '../lib/cloudinary';

// Campus Clubs Data
const CAMPUS_CLUBS = [
    { name: 'Robotics Club', icon: Zap, color: 'bg-brand-accent', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Debate Club', icon: Users, color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600' },
    { name: 'Music Club', icon: Music, color: 'bg-pink-500', gradient: 'from-pink-500 to-pink-600' },
    { name: 'Innovation Hub', icon: Lightbulb, color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600' },
    { name: 'Drama Club', icon: Palette, color: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
    { name: 'Coding Club', icon: Code, color: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600' },
    { name: 'Sports Club', icon: Trophy, color: 'bg-red-500', gradient: 'from-red-500 to-red-600' },
    { name: 'Literary Club', icon: BookOpen, color: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600' },
];

// Mock Featured Events
const FEATURED_EVENTS = [
    {
        id: 1,
        title: 'Annual Tech Fest 2025',
        date: 'Oct 25-27',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
        tag: 'Festival',
        gradient: 'from-blue-600 to-purple-600'
    },
    {
        id: 2,
        title: 'Hackathon Night',
        date: 'Nov 5-6',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop',
        tag: 'Competition',
        gradient: 'from-green-600 to-teal-600'
    }
];

// Mock Upcoming Activities
const UPCOMING_ACTIVITIES = [
    {
        id: 1,
        title: 'AI/ML Workshop',
        type: 'Workshop',
        date: 'Tomorrow, 2 PM',
        location: 'CS Lab 301',
        attendees: 45,
        color: 'blue',
        category: 'Tech'
    },
    {
        id: 2,
        title: 'Photography Walk',
        type: 'Outdoor',
        date: 'Dec 4, 6 PM',
        location: 'Central Lawn',
        attendees: 28,
        color: 'orange',
        category: 'Arts'
    },
    {
        id: 3,
        title: 'Startup Pitch Competition',
        type: 'Competition',
        date: 'Dec 10, 10 AM',
        location: 'Auditorium',
        attendees: 120,
        color: 'green',
        category: 'Business'
    },
    {
        id: 4,
        title: 'React Bootcamp',
        type: 'Workshop',
        date: 'Dec 5, 3 PM',
        location: 'Online',
        attendees: 86,
        color: 'purple',
        category: 'Tech'
    },
    {
        id: 5,
        title: 'Cultural Night',
        type: 'Event',
        date: 'Dec 12, 7 PM',
        location: 'Main Stage',
        attendees: 250,
        color: 'pink',
        category: 'Cultural'
    },
    {
        id: 6,
        title: 'Open Mic',
        type: 'Performance',
        date: 'Dec 8, 6 PM',
        location: 'Cafeteria',
        attendees: 35,
        color: 'yellow',
        category: 'Arts'
    }
];

export default function Discover({ user }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const categories = ['All', 'Tech', 'Arts', 'Business', 'Cultural', 'Sports'];

    const [wishlist, setWishlist] = useState([]);
    const [registrations, setRegistrations] = useState([]);

    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState(null);
    const [isClubDetailModalOpen, setIsClubDetailModalOpen] = useState(false);

    // Fetch events from Firestore
    useEffect(() => {
        const fetchEventsAndClubs = async () => {
            try {
                // Fetch events
                const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
                const eventsSnap = await getDocs(eventsRef);
                const fetchedEvents = eventsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEvents(fetchedEvents);

                // Fetch clubs
                const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
                const clubsSnap = await getDocs(clubsRef);
                const fetchedClubs = clubsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setClubs(fetchedClubs);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setEvents(UPCOMING_ACTIVITIES);
                setClubs(CAMPUS_CLUBS);
                setLoading(false);
            }
        };
        fetchEventsAndClubs();
    }, []);

    // Listen for custom events to open a specific event (e.g., from Home tab)
    useEffect(() => {
        const handleOpenEvent = (e) => {
            if (e.detail) {
                setSelectedEvent(e.detail);
                setIsDetailModalOpen(true);
            }
        };
        window.addEventListener('open-event', handleOpenEvent);
        return () => window.removeEventListener('open-event', handleOpenEvent);
    }, []);

    // Fetch User Wishlist and Registrations
    useEffect(() => {
        if (!user) return;

        // Wishlist Listener
        const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'wishlist', 'events');
        const unsubWishlist = onSnapshot(wishlistRef, (docSnap) => {
            if (docSnap.exists()) {
                setWishlist(docSnap.data().eventIds || []);
            } else {
                setWishlist([]);
            }
        });

        // Registrations Listener
        const registrationsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'registrations', 'events');
        const unsubRegistrations = onSnapshot(registrationsRef, (docSnap) => {
            if (docSnap.exists()) {
                setRegistrations(docSnap.data().eventIds || []);
            } else {
                setRegistrations([]);
            }
        });

        return () => {
            unsubWishlist();
            unsubRegistrations();
        };
    }, [user]);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || event.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleJoinEvent = async (event) => {
        const eventId = event.id;
        if (!user) {
            toast.error('Please login to join events');
            return;
        }
        if (event.isRegistrationOpen === false) {
            toast.error('Registrations for this event are closed.');
            return;
        }
        if (registrations.includes(eventId)) {
            toast.success('You are already registered!');
            return;
        }

        try {
            // 1. Add to user registrations
            const userRegRef = doc(db, 'artifacts', appId, 'users', user.uid, 'registrations', 'events');
            await setDoc(userRegRef, {
                eventIds: arrayUnion(eventId)
            }, { merge: true });

            // 2. Increment event attendees
            const eventRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
            await updateDoc(eventRef, {
                attendees: increment(1)
            });

            // 3. Store user details in event's registrations subcollection for admin
            const eventRegistrationRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'registrations', user.uid);
            await setDoc(eventRegistrationRef, {
                userId: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                email: user.email || 'No email',
                joinedAt: new Date().toISOString()
            });

            // 4. Update local state
            toast.success('Successfully registered for event!');
        } catch (error) {
            console.error('Error joining event:', error);
            toast.error('Failed to join event');
        }
    };

    const handleLikeEvent = async (eventId) => {
        if (!user) {
            toast.error('Please login to wishlist events');
            return;
        }

        const isLiked = wishlist.includes(eventId);
        const wishlistRef = doc(db, 'artifacts', appId, 'users', user.uid, 'wishlist', 'events');

        try {
            if (isLiked) {
                await setDoc(wishlistRef, {
                    eventIds: arrayRemove(eventId)
                }, { merge: true });
                toast.success('Removed from wishlist');
            } else {
                await setDoc(wishlistRef, {
                    eventIds: arrayUnion(eventId)
                }, { merge: true });
                toast.success('Added to wishlist');
            }
        } catch (error) {
            console.error('Error updating wishlist:', error);
            toast.error('Failed to update wishlist');
        }
    };

    return (
        <div className="min-h-screen bg-surface-elevated text-text-main pb-24 px-4 md:px-6 pt-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C08457] to-[#1a3a19] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#111827]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#111827]">Discover</h1>
                </div>
                <p className="text-text-muted text-lg">Explore events, clubs, and opportunities</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search events, clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-elevated border-2 border-border-strong rounded-2xl py-4 pl-12 pr-4 text-text-main placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C08457] focus:border-transparent shadow-sm transition"
                />
            </div>

            {/* Campus Clubs */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-brand-accent" />
                    Campus Clubs
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                    {clubs.map((club, index) => {
                        const IconComponent = club.icon || Users;
                        return (
                            <button
                                key={club.id || index}
                                onClick={() => {
                                    setSelectedClub(club);
                                    setIsClubDetailModalOpen(true);
                                }}
                                className="flex flex-col items-center gap-3 group"
                            >
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${club.gradient || 'from-[#FAF7F2] to-[#FFFFFF]'} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform overflow-hidden border border-[#C08457]/30`}>
                                    {club.logoUrl ? (
                                        <img src={getOptimizedImageUrl(club.logoUrl, '1:1')} alt={club.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <IconComponent className="w-10 h-10 md:w-12 md:h-12 text-brand-accent" />
                                    )}
                                </div>
                                <span className="text-sm font-bold text-text-muted text-center line-clamp-2">{club.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Featured Events */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-accent" />
                        Featured Events
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.filter(e => e.featured).map(event => (
                        <div key={event.id}
                             onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }}
                             className="relative h-64 md:h-72 rounded-3xl overflow-hidden group cursor-pointer shadow-md hover:shadow-2xl transition-all border border-border-strong">
                            <img
                                src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop'}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            
                            {/* Content */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                <div className="mb-auto flex justify-between items-start">
                                    <span className="bg-surface-elevated/20 backdrop-blur-md text-[#111827] text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 shadow-sm">
                                        {event.type}
                                    </span>
                                    <div className="bg-surface-base/90 backdrop-blur-md p-2 rounded-2xl text-center min-w-[3.5rem] shadow-sm">
                                        <div className="text-xs font-bold text-brand-accent uppercase">
                                            {event.date ? event.date.substring(0, 3) : 'TBD'}
                                        </div>
                                    </div>
                                </div>
                                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <h3 className="text-2xl md:text-3xl font-black text-[#111827] mb-2 leading-tight">{event.title}</h3>
                                    <div className="flex items-center gap-4 text-[#111827]/80 text-sm font-medium mb-4">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date}</span>
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location || 'Campus'}</span>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-accent text-[#111827] px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-accent-hover w-fit flex items-center gap-2">
                                        View Details <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>



            {/* Category Filter */}
            <div className="mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${activeCategory === category
                                ? 'bg-brand-accent text-[#111827] shadow-md'
                                : 'bg-surface-elevated text-text-muted hover:bg-surface-elevated border border-border-strong'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upcoming Activities */}
            <div>
                <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-accent" />
                    Upcoming Activities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map(event => (
                        <EventCard
                            key={event.id}
                            event={event}
                            onJoin={handleJoinEvent}
                            onLike={handleLikeEvent}
                            isLiked={wishlist.includes(event.id)}
                            isJoined={registrations.includes(event.id)}
                            onViewDetails={(event) => {
                                setSelectedEvent(event);
                                setIsDetailModalOpen(true);
                            }}
                        />
                    ))}
                </div>
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12 bg-surface-elevated rounded-2xl border border-border-strong">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-text-muted" />
                        <p className="text-text-muted">No events found matching your search</p>
                    </div>
                )}
            </div>

            {/* Club Detail Modal */}
            <ClubDetailModal
                isOpen={isClubDetailModalOpen}
                onClose={() => {
                    setIsClubDetailModalOpen(false);
                    setSelectedClub(null);
                }}
                club={selectedClub}
                events={events.filter(e => e.clubId === (selectedClub?.id))}
                onJoinEvent={handleJoinEvent}
                onLikeEvent={handleLikeEvent}
                registrations={registrations}
                wishlist={wishlist}
            />

            {/* Event Detail Modal */}
            <EventDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
                onJoin={handleJoinEvent}
                isJoined={selectedEvent ? registrations.includes(selectedEvent.id) : false}
                onLike={handleLikeEvent}
                isLiked={selectedEvent ? wishlist.includes(selectedEvent.id) : false}
            />
        </div>
    );
}

// Club Detail Modal
const ClubDetailModal = ({ isOpen, onClose, club, events, onJoinEvent, onLikeEvent, registrations, wishlist }) => {
    if (!isOpen || !club) return null;

    const IconComponent = club.icon || Users;
    const gradient = club.gradient || 'from-slate-800 to-slate-900';

    return (
        <div className="fixed inset-0 z-[100] w-full h-full bg-surface-base overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            
            {/* Navigation Bar - Floating */}
            <div className="fixed top-0 left-0 w-full z-50 p-4 md:p-6 flex justify-between items-start pointer-events-none">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 bg-surface-elevated/90 backdrop-blur-md text-text-muted hover:text-brand-accent px-6 py-3 rounded-full shadow-md hover:shadow-md transition-all pointer-events-auto font-bold text-sm border border-border-strong"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Discover
                </button>
            </div>

            {/* Hero Section */}
            <div className="relative h-[25vh] md:h-[30vh] w-full">
                <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-90`} />
                
                {/* Decorative Elements */}
                <div className="absolute inset-0 overflow-hidden opacity-30">
                    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-surface-elevated/20 blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 pb-24 -mt-20 relative z-10">
                
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end mb-12">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-surface-elevated p-2 shadow-lg flex-shrink-0 relative group border border-border-strong">
                        <div className="w-full h-full rounded-2xl bg-surface-base overflow-hidden flex items-center justify-center">
                            {club.logoUrl ? (
                                <img src={getOptimizedImageUrl(club.logoUrl, '1:1')} alt={club.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <IconComponent className="w-16 h-16 text-text-muted" />
                            )}
                        </div>
                        {club.isVerified && (
                            <div className="absolute -bottom-2 -right-2 bg-brand-accent rounded-full p-1.5 border-4 border-white shadow-md">
                                <Sparkles className="w-5 h-5 text-[#111827]" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-surface-elevated p-6 rounded-3xl shadow-sm border border-border-strong/80 w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg text-blue-700 text-xs font-bold tracking-wide mb-3 border border-blue-100">
                            <Layers className="w-3 h-3" />
                            {club.category || 'Student Community'}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-text-main mb-2 tracking-tight">{club.name}</h1>
                        <p className="text-base md:text-lg text-text-muted font-medium leading-relaxed">
                            {club.tagline || 'Connect, Learn, and Grow with us.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                    
                    {/* Left Column: About & Events */}
                    <div className="lg:col-span-2 space-y-12">
                        
                        {/* About Section */}
                        <section className="bg-surface-elevated rounded-3xl p-8 md:p-10 shadow-sm border border-border-strong">
                            <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-3">
                                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen className="w-6 h-6" /></span>
                                About Us
                            </h2>
                            <p className="text-text-muted text-lg leading-relaxed whitespace-pre-wrap">
                                {club.description || "Welcome to our official profile! We are currently setting things up. Stay tuned for more updates about our activities and mission."}
                            </p>
                            
                            {club.mission && (
                                <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <h3 className="font-bold text-indigo-900 text-lg mb-3 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-indigo-500" /> Our Mission
                                    </h3>
                                    <p className="text-indigo-800 text-lg font-medium leading-relaxed relative z-10">{club.mission}</p>
                                </div>
                            )}
                        </section>

                        {/* Upcoming Events */}
                        {events && events.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                                        <span className="p-2.5 bg-rose-50 text-rose-500 rounded-xl"><Calendar className="w-6 h-6" /></span>
                                        Upcoming Events
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {events.map(event => (
                                        <div key={event.id} className="transform hover:-translate-y-1 transition-all duration-300">
                                            <EventCard
                                                event={event}
                                                onJoin={onJoinEvent}
                                                onLike={onLikeEvent}
                                                isLiked={wishlist.includes(event.id)}
                                                isJoined={registrations.includes(event.id)}
                                                onViewDetails={() => toast("Head back to Discover to view full event details.", { icon: '🔍' })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {/* Media Gallery */}
                        {club.gallery && club.gallery.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-3">
                                    <span className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl"><ImageIcon className="w-6 h-6" /></span>
                                    Gallery
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {club.gallery.map((url, idx) => (
                                        <div key={idx} className="group aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all relative">
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-[#111827] drop-shadow-md" />
                                            </div>
                                            <img src={getOptimizedImageUrl(url, '16:9')} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column: Contact & Team */}
                    <div className="space-y-8">
                        
                        {/* Contact Widget */}
                        <div className="bg-surface-elevated rounded-3xl p-8 shadow-sm border border-border-strong sticky top-24">
                            <h3 className="text-xl font-bold text-text-main mb-6">Contact Info</h3>
                            <div className="space-y-5">
                                <a href={`mailto:${club.contactEmail || club.email}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-base transition group border border-transparent hover:border-border-strong">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-text-muted font-medium mb-0.5">Email Address</p>
                                        <p className="text-sm font-bold text-text-main truncate">{club.contactEmail || club.email || "No email"}</p>
                                    </div>
                                </a>
                                
                                {club.contactPhone && (
                                    <a href={`tel:${club.contactPhone}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-base transition group border border-transparent hover:border-border-strong">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-text-muted font-medium mb-0.5">Phone Number</p>
                                            <p className="text-sm font-bold text-text-main">{club.contactPhone}</p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Core Team Widget */}
                        {club.teamMembers && club.teamMembers.length > 0 && (
                            <div className="bg-surface-elevated rounded-3xl p-8 shadow-sm border border-border-strong">
                                <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                                    Core Team
                                </h3>
                                <div className="space-y-4">
                                    {club.teamMembers.map((member, i) => (
                                        <div key={member.id || i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-base transition group">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                <span className="font-bold text-indigo-600 text-lg">
                                                    {member.name.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-text-main truncate">{member.name}</h4>
                                                <p className="text-sm text-indigo-600 font-medium truncate mb-1">{member.position}</p>
                                                <div className="flex gap-3">
                                                    {member.linkedInUrl && (
                                                        <a href={member.linkedInUrl} target="_blank" rel="noreferrer" className="text-text-muted hover:text-brand-accent transition">
                                                            <Linkedin className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {member.instagramUrl && (
                                                        <a href={member.instagramUrl} target="_blank" rel="noreferrer" className="text-text-muted hover:text-pink-600 transition">
                                                            <Instagram className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                    </div>
                </div>

            </div>
        </div>
    );
};

// Event Detail Modal
export const EventDetailModal = ({ isOpen, onClose, event, onJoin, isJoined, onLike, isLiked }) => {
    if (!isOpen || !event) return null;

    const colorClasses = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', button: 'bg-brand-accent hover:bg-blue-700' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', button: 'bg-orange-600 hover:bg-orange-700' },
        green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', button: 'bg-green-600 hover:bg-green-700' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', button: 'bg-purple-600 hover:bg-purple-700' },
        pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', button: 'bg-pink-600 hover:bg-pink-700' },
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', button: 'bg-yellow-600 hover:bg-yellow-700' },
    };

    const colors = colorClasses[event.color] || colorClasses.blue;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface-elevated rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="relative h-64 md:h-80">
                    {event.image ? (
                        <img src={getOptimizedImageUrl(event.image, '16:9')} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${event.gradient || 'from-blue-500 to-purple-600'}`} />
                    )}
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const shareData = {
                                    title: event.title,
                                    text: `Check out ${event.title} on Campify!`,
                                    url: window.location.href,
                                };
                                if (navigator.share) {
                                    navigator.share(shareData).catch((err) => console.log('Error sharing:', err));
                                } else {
                                    navigator.clipboard.writeText(`${window.location.origin}/login`);
                                    toast.success('Link copied to clipboard!');
                                }
                            }}
                            className="bg-black/20 hover:bg-black/40 text-[#111827] p-2 rounded-full backdrop-blur-md transition"
                        >
                            <Share2 className="w-6 h-6" />
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-black/20 hover:bg-black/40 text-[#111827] p-2 rounded-full backdrop-blur-md transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                        <span className="bg-surface-elevated/20 backdrop-blur-md text-[#111827] text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block border border-white/30">
                            {event.type}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-[#111827] mb-2">{event.title}</h2>
                        <div className="flex items-center gap-4 text-[#111827]/90">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Calendar className="w-4 h-4" />
                                <span>{event.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {event.category}
                            </span>
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-surface-elevated text-text-muted border border-border-strong flex items-center gap-2">
                                <Users className="w-4 h-4" /> {event.attendees} Attending
                            </span>
                        </div>
                        <button
                            onClick={() => onLike(event.id)}
                            className={`p-2 rounded-full transition ${isLiked ? 'bg-red-50 text-red-500' : 'bg-surface-base text-text-muted hover:text-red-500'}`}
                        >
                            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                    </div>

                    <div className="prose prose-lg text-text-muted mb-8">
                        <h3 className="text-text-main font-bold text-xl mb-2">About Event</h3>
                        <p>{event.description || "No description available for this event."}</p>
                    </div>

                    <button
                        onClick={() => onJoin(event)}
                        disabled={isJoined || event.isRegistrationOpen === false}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${isJoined || event.isRegistrationOpen === false
                            ? 'bg-surface-elevated text-text-muted cursor-default shadow-none'
                            : `${colors.button} text-[#111827]`
                            }`}
                    >
                        {event.isRegistrationOpen === false ? 'Registrations Closed' : (isJoined ? 'Registered Successfully ✓' : 'Join Event Now')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Event Card Component
const EventCard = ({ event, onJoin, onLike, isLiked, isJoined, onViewDetails }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', button: 'bg-brand-accent hover:bg-blue-700' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', button: 'bg-orange-600 hover:bg-orange-700' },
        green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', button: 'bg-green-600 hover:bg-green-700' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', button: 'bg-purple-600 hover:bg-purple-700' },
        pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', button: 'bg-pink-600 hover:bg-pink-700' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', button: 'bg-yellow-600 hover:bg-yellow-700' },
    };

    const colors = colorClasses[event.color] || colorClasses.blue;

    return (
        <div className="bg-surface-elevated rounded-2xl border border-border-strong hover:shadow-md transition-all group overflow-hidden flex flex-col h-full">
            {/* Event Image */}
            <div className="relative h-48 w-full overflow-hidden cursor-pointer" onClick={() => onViewDetails(event)}>
                {event.image ? (
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${event.gradient || 'from-gray-100 to-gray-200'} group-hover:scale-110 transition-transform duration-500`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-3 right-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLike(event.id);
                        }}
                        className={`p-2 rounded-full backdrop-blur-md transition ${isLiked ? 'bg-surface-elevated text-red-500' : 'bg-black/20 text-[#111827] hover:bg-surface-elevated hover:text-red-500'}`}
                    >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                    <span className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-bold border ${colors.border}`}>
                        {event.type}
                    </span>
                </div>

                <h3
                    onClick={() => onViewDetails(event)}
                    className="font-bold text-text-main text-lg mb-3 group-hover:text-brand-accent transition line-clamp-2 cursor-pointer"
                >
                    {event.title}
                </h3>

                <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>{event.attendees} attending</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onViewDetails(event)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm transition border border-border-strong hover:bg-surface-base text-text-muted"
                    >
                        View Details
                    </button>
                    <button
                        onClick={() => onJoin(event)}
                        disabled={isJoined || event.isRegistrationOpen === false}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition shadow-md ${isJoined || event.isRegistrationOpen === false
                            ? 'bg-surface-elevated text-text-muted cursor-default shadow-none'
                            : `${colors.button} text-[#111827]`
                            }`}
                    >
                        {event.isRegistrationOpen === false ? 'Closed' : (isJoined ? 'Joined' : 'Join')}
                    </button>
                </div>
            </div>
        </div>
    );
};

