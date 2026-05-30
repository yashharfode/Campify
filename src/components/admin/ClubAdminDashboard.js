'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Edit2, Users, Calendar, Image, Link, MapPin, Mail, Loader2, X, Download, MessageSquare, Settings, FileText } from 'lucide-react';
import { db, appId } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, arrayUnion, arrayRemove, query, where, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { uploadToCloudinary, getOptimizedImageUrl } from '../../lib/cloudinary';

export default function ClubAdminDashboard({ user, userData, targetClubId }) {
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState('events'); // events, info, about, team, media

  // Form States
  const [basicInfo, setBasicInfo] = useState({ name: '', tagline: '' });
  const [aboutInfo, setAboutInfo] = useState({ description: '', mission: '', contactEmail: '', contactPhone: '' });
  
  // Media States
  const [logoUploading, setLogoUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  
  // Team Member State
  const [newTeamMember, setNewTeamMember] = useState({ name: '', position: '', linkedInUrl: '', instagramUrl: '' });
  const [isAddingTeam, setIsAddingTeam] = useState(false);

  // Event Form State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventImagePreview, setNewEventImagePreview] = useState('');
  const [isEventImageUploading, setIsEventImageUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClubData = async () => {
    if (!user) return;
    try {
      const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
      let querySnapshot;

      if (targetClubId) {
        // Super Admin viewing specific club
        const clubDocRef = doc(clubsRef, targetClubId);
        const docSnap = await getDocs(query(clubsRef, where('__name__', '==', targetClubId)));
        querySnapshot = docSnap;
      } else {
        // Regular Club Admin viewing their assigned club
        const q = query(clubsRef, where('presidentId', '==', user.uid));
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        const clubDoc = querySnapshot.docs[0];
        const data = clubDoc.data();
        setClub({ id: clubDoc.id, ...data });
        setBasicInfo({ name: data.name || '', tagline: data.tagline || '' });
        setAboutInfo({ 
          description: data.description || '', 
          mission: data.mission || '', 
          contactEmail: data.contactEmail || '', 
          contactPhone: data.contactPhone || '' 
        });
        fetchEvents(clubDoc.id);
      } else {
        setClub(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast.error('Failed to load club data');
      setLoading(false);
    }
  };

  const fetchEvents = async (clubId) => {
    try {
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
      const q = query(eventsRef, where('clubId', '==', clubId));
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort by date manually if composite index on clubId + date isn't ready
      eventsData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, [user, targetClubId]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !newEventDesc) {
      toast.error('Please fill all event fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
      await addDoc(eventsRef, {
        clubId: club.id,
        clubName: club.name,
        title: newEventTitle,
        date: newEventDate,
        description: newEventDesc,
        image: newEventImagePreview || '',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      toast.success('Event added successfully!');
      setIsEventModalOpen(false);
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventDesc('');
      setNewEventImagePreview('');
      fetchEvents(club.id);
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId));
      toast.success('Event deleted');
      setEvents(events.filter(e => e.id !== eventId));
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

  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState(null);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const handleViewRegistrations = async (event) => {
    setSelectedEventForRegistrations(event);
    setIsRegistrationsModalOpen(true);
    setLoadingRegistrations(true);
    try {
      const regsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events', event.id, 'registrations');
      const snap = await getDocs(regsRef);
      const regs = snap.docs.map(doc => doc.data());
      // Sort by join date ascending
      regs.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
      setEventRegistrations(regs);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!eventRegistrations.length) return;
    const headers = ['Name', 'Email', 'Joined At'];
    const rows = eventRegistrations.map(reg => [
      `"${reg.name || ''}"`,
      `"${reg.email || ''}"`,
      `"${new Date(reg.joinedAt).toLocaleString()}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEventForRegistrations.title.replace(/\s+/g, '_')}_Registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- NEW HANDLERS ---
  const handleEventImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2097152) {
      toast.error('File size must be less than 2MB');
      return;
    }
    try {
      setIsEventImageUploading(true);
      const secure_url = await uploadToCloudinary(file);
      setNewEventImagePreview(secure_url);
    } catch (error) {
      toast.error('Failed to process image');
    } finally {
      setIsEventImageUploading(false);
    }
  };

  const handleUpdateBasicInfo = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, {
        name: basicInfo.name,
        tagline: basicInfo.tagline,
        updatedAt: serverTimestamp()
      });
      setClub(prev => ({ ...prev, name: basicInfo.name, tagline: basicInfo.tagline }));
      toast.success('Basic info updated');
    } catch (error) {
      toast.error('Failed to update basic info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAboutInfo = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, {
        description: aboutInfo.description,
        mission: aboutInfo.mission,
        contactEmail: aboutInfo.contactEmail,
        contactPhone: aboutInfo.contactPhone,
        updatedAt: serverTimestamp()
      });
      setClub(prev => ({ ...prev, ...aboutInfo }));
      toast.success('About info updated');
    } catch (error) {
      toast.error('Failed to update about info');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2097152) { // 2MB limit for Cloudinary
      toast.error('File size must be less than 2MB');
      return;
    }
    
    try {
      setLogoUploading(true);
      
      // Upload directly to Cloudinary
      const secure_url = await uploadToCloudinary(file);
      
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { logoUrl: secure_url, updatedAt: serverTimestamp() });
      
      setClub(prev => ({ ...prev, logoUrl: secure_url }));
      toast.success('Logo updated successfully via Cloudinary');
      
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error(error.message || 'Failed to process image');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      toast.error('File size must be less than 1MB');
      return;
    }

    try {
      setGalleryUploading(true);
      
      const url = await uploadToCloudinary(file);
      
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { 
        gallery: arrayUnion(url), 
        updatedAt: serverTimestamp() 
      });
      setClub(prev => ({ ...prev, gallery: [...(prev.gallery || []), url] }));
      toast.success('Image added to gallery');
    } catch (error) {
      console.error(error);
      toast.error('Failed to process image');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDeleteGalleryImage = async (url) => {
    if(!window.confirm('Remove this image from gallery?')) return;
    try {
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { 
        gallery: arrayRemove(url), 
        updatedAt: serverTimestamp() 
      });
      setClub(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
      toast.success('Image removed');
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    try {
      setIsAddingTeam(true);
      const newMember = { ...newTeamMember, id: Date.now().toString() };
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { 
        teamMembers: arrayUnion(newMember), 
        updatedAt: serverTimestamp() 
      });
      setClub(prev => ({ ...prev, teamMembers: [...(prev.teamMembers || []), newMember] }));
      setNewTeamMember({ name: '', position: '', linkedInUrl: '', instagramUrl: '' });
      toast.success('Team member added');
    } catch (error) {
      toast.error('Failed to add team member');
    } finally {
      setIsAddingTeam(false);
    }
  };

  const handleRemoveTeamMember = async (member) => {
    if(!window.confirm('Remove this team member?')) return;
    try {
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { 
        teamMembers: arrayRemove(member), 
        updatedAt: serverTimestamp() 
      });
      setClub(prev => ({ ...prev, teamMembers: prev.teamMembers.filter(m => m.id !== member.id) }));
      toast.success('Team member removed');
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-accent mb-4" />
        <p className="text-text-muted font-medium">Loading your club dashboard...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 bg-surface-elevated border border-border-strong rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-text-muted mb-2">No Club Assigned</h2>
        <p className="text-text-muted max-w-md">
          Your account has the 'club_admin' role, but you haven't been assigned as the president of any active club yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-base min-h-screen">
      {/* Admin Dashboard Header (Dark Theme - Silent Coder) */}
      <div className="bg-surface-highlight border-b border-border-strong text-text-main">
        <div className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-surface-highlight border-2 border-border-subtle overflow-hidden shadow-lg shrink-0 flex items-center justify-center">
                {club.logoUrl ? (
                  <img src={getOptimizedImageUrl(club.logoUrl, '1:1')} alt={club.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-text-muted" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
                  {club.isVerified && <ShieldCheck className="w-6 h-6 text-blue-400" />}
                </div>
                <p className="text-text-muted text-lg mb-2">{club.tagline}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-accent/20 text-[#4CAF50] border border-[#C08457]/30">
                    <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse"></span>
                    President View
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-surface-highlight text-text-muted border border-border-subtle">
                    {club.category}
                  </span>
                </div>
              </div>
            </div>

            <button className="bg-surface-highlight hover:bg-border-strong text-text-main px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-border-subtle">
              <Settings size={18} /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-base rounded-2xl p-6 shadow-sm border border-border-strong flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Total Members</p>
              <h3 className="text-2xl font-bold text-text-main">42</h3>
            </div>
          </div>
          <div className="bg-surface-base rounded-2xl p-6 shadow-sm border border-border-strong flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Active Events</p>
              <h3 className="text-2xl font-bold text-text-main">{events.length}</h3>
            </div>
          </div>
          <div className="bg-surface-base rounded-2xl p-6 shadow-sm border border-border-strong flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Club Status</p>
              <h3 className="text-2xl font-bold text-text-main">{club.status}</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-4 border-b border-border-strong hide-scrollbar">
          {['events', 'info', 'about', 'team', 'media'].map(tab => (
            <button
              key={tab}
              onClick={() => setDashboardTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition whitespace-nowrap ${
                dashboardTab === tab ? 'bg-surface-elevated text-text-main' : 'bg-surface-base text-text-muted hover:bg-surface-elevated border border-border-strong'
              }`}
            >
              {tab === 'events' ? 'Events' :
               tab === 'info' ? 'Basic Info' :
               tab === 'about' ? 'About & Contact' :
               tab === 'team' ? 'Core Team' :
               'Media Gallery'}
            </button>
          ))}
        </div>

        {/* Events Management */}
        {dashboardTab === 'events' && (
          <div className="bg-surface-base rounded-2xl shadow-sm border border-border-strong overflow-hidden">
            <div className="p-6 border-b border-border-strong flex items-center justify-between bg-surface-elevated/50">
              <div>
                <h2 className="text-lg font-bold text-text-main">Events Management</h2>
                <p className="text-sm text-text-muted">Create and manage your club's upcoming events.</p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="bg-brand-accent hover:bg-brand-accent-hover text-text-main px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-green-900/20"
              >
                <Plus size={18} /> New Event
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {events.length === 0 ? (
                <div className="p-12 text-center text-text-muted">
                  <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p>No events found. Create your first event!</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-surface-elevated transition group">
                    <div>
                      <h4 className="font-bold text-text-main text-lg mb-1">{event.title}</h4>
                      <p className="text-text-muted text-sm mb-2 max-w-2xl">{event.description}</p>
                      <div className="inline-flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted">
                        <Calendar size={14} />
                        {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleToggleRegistration(event.id, event.isRegistrationOpen)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          event.isRegistrationOpen !== false
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {event.isRegistrationOpen !== false ? 'Open' : 'Closed'}
                      </button>
                      <button
                        onClick={() => handleViewRegistrations(event)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition flex items-center gap-1.5"
                      >
                        <Users size={14} /> Registrations
                      </button>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {dashboardTab === 'info' && (
          <div className="bg-surface-base rounded-2xl shadow-sm border border-border-strong p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">Basic Information</h2>
            <form onSubmit={handleUpdateBasicInfo} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Club Name</label>
                <input 
                  type="text" value={basicInfo.name} onChange={e => setBasicInfo({...basicInfo, name: e.target.value})} 
                  className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Tagline</label>
                <input 
                  type="text" value={basicInfo.tagline} onChange={e => setBasicInfo({...basicInfo, tagline: e.target.value})} 
                  className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Club Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-surface-elevated border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden">
                    {club.logoUrl ? <img src={club.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-text-muted" />}
                  </div>
                  <label className="bg-surface-elevated hover:bg-surface-highlight text-text-muted px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition flex items-center gap-2">
                    {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="bg-surface-elevated hover:bg-surface-highlight text-text-main px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {dashboardTab === 'about' && (
          <div className="bg-surface-base rounded-2xl shadow-sm border border-border-strong p-6">
            <h2 className="text-lg font-bold text-text-main mb-4">About & Contact</h2>
            <form onSubmit={handleUpdateAboutInfo} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                <textarea 
                  rows={4} value={aboutInfo.description} onChange={e => setAboutInfo({...aboutInfo, description: e.target.value})} 
                  className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                  placeholder="Detailed description of the club..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Mission Statement</label>
                <textarea 
                  rows={2} value={aboutInfo.mission} onChange={e => setAboutInfo({...aboutInfo, mission: e.target.value})} 
                  className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Contact Email</label>
                  <input 
                    type="email" value={aboutInfo.contactEmail} onChange={e => setAboutInfo({...aboutInfo, contactEmail: e.target.value})} 
                    className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Contact Phone</label>
                  <input 
                    type="tel" value={aboutInfo.contactPhone} onChange={e => setAboutInfo({...aboutInfo, contactPhone: e.target.value})} 
                    className="w-full bg-surface-elevated border border-border-strong rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none" 
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="bg-surface-elevated hover:bg-surface-highlight text-text-main px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {dashboardTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-surface-base rounded-2xl shadow-sm border border-border-strong p-6">
              <h2 className="text-lg font-bold text-text-main mb-4">Add Team Member</h2>
              <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="Name" value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})} className="bg-surface-elevated border border-border-strong rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#C08457]" />
                <input required type="text" placeholder="Position (e.g., Vice President)" value={newTeamMember.position} onChange={e => setNewTeamMember({...newTeamMember, position: e.target.value})} className="bg-surface-elevated border border-border-strong rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#C08457]" />
                <input type="url" placeholder="LinkedIn URL" value={newTeamMember.linkedInUrl} onChange={e => setNewTeamMember({...newTeamMember, linkedInUrl: e.target.value})} className="bg-surface-elevated border border-border-strong rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#C08457]" />
                <input type="url" placeholder="Instagram URL" value={newTeamMember.instagramUrl} onChange={e => setNewTeamMember({...newTeamMember, instagramUrl: e.target.value})} className="bg-surface-elevated border border-border-strong rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#C08457]" />
                <div className="md:col-span-2 mt-2">
                  <button type="submit" disabled={isAddingTeam} className="bg-surface-elevated hover:bg-surface-highlight transition text-text-main px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
                    {isAddingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />} Add Member
                  </button>
                </div>
              </form>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {club.teamMembers?.map(member => (
                <div key={member.id} className="bg-surface-base rounded-2xl p-4 shadow-sm border border-border-strong flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-text-main">{member.name}</h4>
                    <p className="text-sm text-text-muted mb-1">{member.position}</p>
                    <div className="flex gap-2">
                      {member.linkedInUrl && <a href={member.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">LinkedIn</a>}
                      {member.instagramUrl && <a href={member.instagramUrl} target="_blank" rel="noreferrer" className="text-pink-600 hover:underline text-xs">Instagram</a>}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveTeamMember(member)} className="text-text-muted hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {(!club.teamMembers || club.teamMembers.length === 0) && (
                <div className="col-span-full text-center p-8 text-text-muted bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No team members added yet.
                </div>
              )}
            </div>
          </div>
        )}

        {dashboardTab === 'media' && (
          <div className="bg-surface-base rounded-2xl shadow-sm border border-border-strong p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-main">Media Gallery</h2>
                <p className="text-sm text-text-muted">Upload photos from events and activities.</p>
              </div>
              <label className="bg-brand-accent hover:bg-brand-accent-hover text-text-main px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-green-900/20">
                {galleryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />} Upload Image
                <input type="file" className="hidden" accept="image/*" onChange={handleGalleryUpload} disabled={galleryUploading} />
              </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
              {club.gallery?.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-border-strong">
                  <img src={getOptimizedImageUrl(url, '16:9')} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={() => handleDeleteGalleryImage(url)} className="bg-red-500 text-text-main p-2 rounded-full hover:scale-110 transition shadow-md">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {(!club.gallery || club.gallery.length === 0) && (
                <div className="col-span-full p-12 text-center text-text-muted flex flex-col items-center bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                  <Image className="w-12 h-12 mb-2 opacity-30" />
                  <p>Your gallery is empty.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Add Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border-strong rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border-strong flex justify-between items-center bg-surface-elevated">
              <h3 className="font-bold text-xl text-text-main">Create Event</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-text-muted hover:text-text-main transition">
                <Trash2 size={20} className="hidden" /> {/* Placeholder for X icon if needed, though usually X is imported from lucide-react. I'll just use text. */}
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none"
                  placeholder="e.g., Intro to Cybersecurity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-[#C08457] outline-none"
                  placeholder="What is this event about?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Event Image (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-base border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden">
                    {newEventImagePreview ? <img src={newEventImagePreview} alt="Event Preview" className="w-full h-full object-cover" /> : <Image className="w-6 h-6 text-text-muted" />}
                  </div>
                  <label className="bg-surface-highlight hover:bg-border-strong text-text-main px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition flex items-center gap-2">
                    {isEventImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Image'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleEventImageUpload} disabled={isEventImageUploading} />
                  </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="flex-1 bg-surface-highlight text-text-main font-bold py-3 rounded-xl hover:bg-border-strong transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-brand-accent text-text-main font-bold py-3 rounded-xl hover:bg-brand-accent-hover transition disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Registrations Modal */}
      {isRegistrationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-strong flex justify-between items-center bg-surface-highlight">
              <div>
                <h3 className="text-xl font-bold text-text-main">Event Registrations</h3>
                <p className="text-sm text-text-muted">{selectedEventForRegistrations?.title}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadCSV}
                  disabled={!eventRegistrations.length || loadingRegistrations}
                  className="bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-text-main px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"
                >
                  <FileText size={18} /> Download CSV
                </button>
                <button
                  onClick={() => setIsRegistrationsModalOpen(false)}
                  className="bg-surface-highlight hover:bg-border-strong text-text-main px-4 py-2 rounded-xl text-sm font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-surface-elevated text-text-main flex-1">
              {loadingRegistrations ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-accent mb-4" />
                  <p className="text-text-muted">Loading registrations...</p>
                </div>
              ) : eventRegistrations.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No one has registered for this event yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-strong text-text-muted text-sm">
                        <th className="py-3 px-4 font-semibold">Name</th>
                        <th className="py-3 px-4 font-semibold">Email</th>
                        <th className="py-3 px-4 font-semibold">Joined At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {eventRegistrations.map((reg, idx) => (
                        <tr key={idx} className="hover:bg-[#202020] transition">
                          <td className="py-3 px-4 font-medium">{reg.name}</td>
                          <td className="py-3 px-4 text-text-muted">{reg.email}</td>
                          <td className="py-3 px-4 text-text-muted text-sm">
                            {new Date(reg.joinedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

