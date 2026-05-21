'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, ShieldCheck, Megaphone, Loader2, UserX } from 'lucide-react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, collectionGroup, query, where } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { uploadToCloudinary, getOptimizedImageUrl } from '../../lib/cloudinary';

// ------------------------------
// Validation Schema (Zod)
// ------------------------------
const clubSchema = z.object({
  name: z.string().min(2, 'Club name is required').max(100),
  tagline: z.string().min(5, 'Tagline should be at least 5 characters').max(150),
  description: z.string().min(10, 'Description is required'),
  category: z.enum(['Tech', 'Arts', 'Business', 'Cultural', 'Sports', 'Other']),
  status: z.enum(['Active', 'Inactive', 'Full']),
  instagram: z.string().url('Must be a valid URL').or(z.literal('')),
  linkedin: z.string().url('Must be a valid URL').or(z.literal('')),
  github: z.string().url('Must be a valid URL').or(z.literal('')),
  website: z.string().url('Must be a valid URL').or(z.literal('')),
  coreTeam: z.string().min(1, 'Please specify the Club Head/Admin'),
  email: z.string().email('Invalid email address'),
  isVerified: z.boolean().default(false),
});

// Create a client
const queryClient = new QueryClient();

export default function ClubsManagerWithProvider({ user, setAppTab, setTargetClubId }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClubsManager user={user} setAppTab={setAppTab} setTargetClubId={setTargetClubId} />
    </QueryClientProvider>
  );
}

function ClubsManager({ user, setAppTab, setTargetClubId }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Assign President State
  const [assignEmail, setAssignEmail] = useState('');
  const [assignClubId, setAssignClubId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fileInputRef = useRef(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: '', tagline: '', description: '', category: 'Tech', status: 'Active',
      instagram: '', linkedin: '', github: '', website: '', coreTeam: '', email: '', isVerified: false
    }
  });

  // ------------------------------
  // Fetch Clubs
  // ------------------------------
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
      const snapshot = await getDocs(clubsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // ------------------------------
  // Mutations
  // ------------------------------
  const addClubMutation = useMutation({
    mutationFn: async (newClub) => {
      const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
      return await addDoc(clubsRef, { ...newClub, createdAt: serverTimestamp(), createdBy: user.uid });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club added successfully!');
      closeModal();
    },
    onError: (err) => toast.error('Error adding club: ' + err.message)
  });

  const updateClubMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', id);
      return await updateDoc(clubRef, { ...data, updatedAt: serverTimestamp() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club updated successfully!');
      closeModal();
    },
    onError: (err) => toast.error('Error updating club: ' + err.message)
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (id) => {
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', id);
      return await deleteDoc(clubRef);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Club deleted successfully!');
    },
    onError: (err) => toast.error('Error deleting club: ' + err.message)
  });

  const handleAssignPresident = async (e) => {
    e.preventDefault();
    if (!assignEmail || !assignClubId) {
      toast.error('Please provide an email and select a club.');
      return;
    }

    setIsAssigning(true);
    try {
      // 1. Search for user by email across all profile subcollections
      const profilesRef = collectionGroup(db, 'profile');
      const q = query(profilesRef, where('email', '==', assignEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('User not found. Ask them to register first.');
        setIsAssigning(false);
        return;
      }

      // There should only be one profile per user/email
      const userProfileDoc = querySnapshot.docs[0];

      // The parent of 'profile/data' is the user UID document
      // Because the path is artifacts/{appId}/users/{uid}/profile/data, the UID is the parent's parent's ID
      // It's safer to just get the userRef directly from the doc's path: doc.ref
      const userRef = userProfileDoc.ref;
      const userUid = userProfileDoc.ref.parent.parent.id; // Correct UID extraction

      const userData = userProfileDoc.data();
      const userName = userData.name || userData.displayName || 'Unknown';

      // 2. Update the user role to 'club_admin'
      await updateDoc(userRef, { role: 'club_admin', updatedAt: new Date().toISOString() });

      // 3. Link user UID to the chosen club
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', assignClubId);
      await updateDoc(clubRef, { 
        presidentId: userUid, 
        presidentName: userName,
        presidentEmail: assignEmail.trim().toLowerCase(),
        updatedAt: serverTimestamp() 
      });

      toast.success(`Role assigned! ${assignEmail} is now the president.`);
      setAssignEmail('');
      setAssignClubId('');
      qc.invalidateQueries({ queryKey: ['clubs'] });
    } catch (error) {
      console.error('Error assigning president:', error);
      toast.error('Failed to assign president: ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRevokePresident = async (club) => {
    if (!window.confirm(`Are you sure you want to revoke ${club.presidentName}'s access as president?`)) return;
    
    try {
      // 1. Revert user role to student
      if (club.presidentId) {
        const userRef = doc(db, 'artifacts', appId, 'users', club.presidentId, 'profile', 'data');
        await updateDoc(userRef, { role: 'student', updatedAt: new Date().toISOString() });
      }
      
      // 2. Clear club document
      const clubRef = doc(db, 'artifacts', appId, 'public', 'data', 'clubs', club.id);
      await updateDoc(clubRef, { 
        presidentId: null,
        presidentName: null,
        presidentEmail: null,
        updatedAt: serverTimestamp() 
      });

      toast.success("President's access revoked successfully.");
      qc.invalidateQueries({ queryKey: ['clubs'] });
    } catch (error) {
      console.error('Error revoking president:', error);
      toast.error('Failed to revoke access: ' + error.message);
    }
  };

  // ------------------------------
  // Handlers
  // ------------------------------
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2097152) { // 2MB
        toast.error('Image too large! Max 2MB');
        return;
      }
      try {
        toast.loading('Uploading logo...', { id: 'clubLogo' });
        const url = await uploadToCloudinary(file);
        setLogoPreview(url);
        toast.success('Logo uploaded!', { id: 'clubLogo' });
      } catch (err) {
        toast.error('Failed to upload logo', { id: 'clubLogo' });
      }
    }
  };

  const onSubmit = async (data) => {
    setIsUploading(true);
    try {
      const clubData = {
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        category: data.category,
        status: data.status,
        socialLinks: {
          instagram: data.instagram,
          linkedin: data.linkedin,
          github: data.github,
          website: data.website
        },
        coreTeam: data.coreTeam,
        email: data.email,
        isVerified: data.isVerified,
        logoUrl: logoPreview, // Save Base64 directly
      };

      if (editingClub) {
        updateClubMutation.mutate({ id: editingClub.id, data: clubData });
      } else {
        addClubMutation.mutate(clubData);
      }
    } catch (error) {
      toast.error('Failed to upload image or save club');
      setIsUploading(false);
    }
  };

  const openEditModal = (club) => {
    setEditingClub(club);
    setValue('name', club.name);
    setValue('tagline', club.tagline);
    setValue('description', club.description);
    setValue('category', club.category);
    setValue('status', club.status);
    setValue('instagram', club.socialLinks?.instagram || '');
    setValue('linkedin', club.socialLinks?.linkedin || '');
    setValue('github', club.socialLinks?.github || '');
    setValue('website', club.socialLinks?.website || '');
    setValue('coreTeam', club.coreTeam);
    setValue('email', club.email);
    setValue('isVerified', club.isVerified || false);
    setLogoPreview(club.logoUrl || '');
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClub(null);
    setLogoPreview('');
    reset();
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 shadow-sm">
          <h4 className="text-gray-400 text-sm font-medium mb-1">Total Clubs</h4>
          <p className="text-3xl font-bold text-white">{clubs.length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 shadow-sm">
          <h4 className="text-gray-400 text-sm font-medium mb-1">Active Clubs</h4>
          <p className="text-3xl font-bold text-green-500">
            {clubs.filter(c => c.status === 'Active').length}
          </p>
        </div>
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-gray-400 text-sm font-medium mb-1">Quick Action</h4>
            <p className="text-white text-sm">Add a new organization</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2D5A27] hover:bg-[#397032] text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={18} /> Add Club
          </button>
        </div>
      </div>

      {/* Assign President Section */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-white mb-4">Assign Club President</h3>
        <form onSubmit={handleAssignPresident} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1">User Email Address</label>
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
              placeholder="student@college.edu"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Club</label>
            <select
              value={assignClubId}
              onChange={(e) => setAssignClubId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
            >
              <option value="">-- Choose a Club --</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isAssigning}
            className="bg-[#2D5A27] hover:bg-[#397032] text-white px-6 py-2.5 rounded-lg font-bold transition disabled:opacity-70 h-[46px] min-w-[120px] flex items-center justify-center"
          >
            {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assign Role'}
          </button>
        </form>
      </div>

      {/* Clubs Table */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#141414]">
                <th className="p-4 text-sm font-semibold text-gray-300">Club Name</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Category</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-300">President</th>
                <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading clubs...
                  </td>
                </tr>
              ) : clubs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No clubs found. Create one to get started!
                  </td>
                </tr>
              ) : (
                clubs.map(club => (
                  <tr key={club.id} className="border-b border-gray-800 hover:bg-[#202020] transition group">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700">
                        {club.logoUrl ? (
                          <img src={getOptimizedImageUrl(club.logoUrl, '1:1')} alt={club.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-100 flex items-center gap-1.5">
                          {club.name}
                          {club.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400" title="Verified" />}
                        </div>
                        <div className="text-xs text-gray-500">{club.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                        {club.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${club.status === 'Active' ? 'text-green-400' :
                          club.status === 'Full' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${club.status === 'Active' ? 'bg-green-400' :
                            club.status === 'Full' ? 'bg-yellow-400' : 'bg-red-400'
                          }`} />
                        {club.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {club.presidentName ? (
                        <div>
                          <div className="text-sm font-medium text-gray-200">{club.presidentName}</div>
                          <div className="text-xs text-gray-500">{club.presidentEmail}</div>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                          No President
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toast('Notification feature coming soon!', { icon: '📢' })}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition"
                          title="Announce"
                        >
                          <Megaphone size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if (setTargetClubId && setAppTab) {
                              setTargetClubId(club.id);
                              setAppTab('club_command');
                            } else {
                              toast.error('Navigation not available');
                            }
                          }}
                          className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/50 rounded-md transition"
                          title="Manage Club Dashboard"
                        >
                          <ShieldCheck size={18} />
                        </button>
                        {club.presidentId && (
                          <button
                            onClick={() => handleRevokePresident(club)}
                            className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-900/50 rounded-md transition"
                            title="Revoke President Access"
                          >
                            <UserX size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(club)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this club? This cannot be undone.')) {
                              deleteClubMutation.mutate(club.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1A1A1A] shrink-0">
              <h3 className="font-bold text-xl text-white">
                {editingClub ? 'Edit Club' : 'Add New Club'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition bg-gray-800/50 hover:bg-gray-800 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="clubForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Club Logo</label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gray-500 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <img src={getOptimizedImageUrl(logoPreview, '1:1')} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Upload Image
                      </button>
                      <p className="text-xs text-gray-500 mt-2">Max size: 500KB. 1:1 aspect ratio recommended.</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Club Name *</label>
                    <input
                      {...register('name')}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent outline-none transition"
                      placeholder="e.g., Cyber-Security Cell"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                    <select
                      {...register('category')}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                    >
                      <option value="Tech">Tech</option>
                      <option value="Arts">Arts</option>
                      <option value="Business">Business</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Sports">Sports</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tagline *</label>
                  <input
                    {...register('tagline')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                    placeholder="Short catchy description"
                  />
                  {errors.tagline && <p className="text-red-400 text-xs mt-1">{errors.tagline.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                    placeholder="Tell us about the club's purpose and vision..."
                  />
                  {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Membership Status</label>
                    <select
                      {...register('status')}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Club Email *</label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                      placeholder="official@club.com"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Core Team / Head *</label>
                  <input
                    {...register('coreTeam')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#2D5A27] outline-none"
                    placeholder="Name or Email of the President"
                  />
                  {errors.coreTeam && <p className="text-red-400 text-xs mt-1">{errors.coreTeam.message}</p>}
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-800">
                  <h4 className="text-white font-medium">Social Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Instagram URL</label>
                      <input {...register('instagram')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-[#2D5A27] outline-none" placeholder="https://instagram.com/..." />
                      {errors.instagram && <p className="text-red-400 text-xs mt-1">{errors.instagram.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">LinkedIn URL</label>
                      <input {...register('linkedin')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-[#2D5A27] outline-none" placeholder="https://linkedin.com/..." />
                      {errors.linkedin && <p className="text-red-400 text-xs mt-1">{errors.linkedin.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">GitHub URL</label>
                      <input {...register('github')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-[#2D5A27] outline-none" placeholder="https://github.com/..." />
                      {errors.github && <p className="text-red-400 text-xs mt-1">{errors.github.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Website URL (Optional)</label>
                      <input {...register('website')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-[#2D5A27] outline-none" placeholder="https://..." />
                      {errors.website && <p className="text-red-400 text-xs mt-1">{errors.website.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800 flex items-center gap-3">
                  <input type="checkbox" id="isVerified" {...register('isVerified')} className="w-4 h-4 rounded border-gray-700 text-[#2D5A27] focus:ring-[#2D5A27] bg-gray-900" />
                  <label htmlFor="isVerified" className="text-sm font-medium text-gray-300">
                    Grant Verification Badge (Official Club)
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-800 bg-[#141414] shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="clubForm"
                disabled={isUploading}
                className="bg-[#2D5A27] hover:bg-[#397032] text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-70 flex items-center gap-2 shadow-[0_0_15px_rgba(45,90,39,0.3)]"
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                ) : (
                  editingClub ? 'Update Club' : 'Create Club'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
