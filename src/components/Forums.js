'use client';

import React, { useState, useEffect } from 'react';
import { 
    collection, addDoc, getDocs, doc, updateDoc, increment, 
    serverTimestamp, query, orderBy, onSnapshot, setDoc, getDoc, deleteDoc
} from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { 
    MessageSquare, ThumbsUp, MessageCircle, Clock, 
    Plus, X, Filter, Loader2, ArrowLeft, Send, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkCooldown, awardKarma } from '../lib/karma';

export default function Forums({ user, userData, isDbAdmin }) {
    const [view, setView] = useState('feed'); // 'feed' | 'post'
    const [activePost, setActivePost] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // 'All', 'General', 'Academics', 'Clubs'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const SUPER_ADMINS = ['yash.harfode.sati@gmail.com', 'yashharfode123@gmail.com'];
    const isSuperAdmin = user?.email && SUPER_ADMINS.includes(user.email.toLowerCase());

    // New Post Form
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
    const [submitting, setSubmitting] = useState(false);

    // Comments State
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Upvotes local state (to avoid UI jumpiness)
    const [userVotes, setUserVotes] = useState({});

    // Fetch Posts
    useEffect(() => {
        const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'forums');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPosts(fetchedPosts);
            setLoading(false);
            
            // Re-sync active post if it's open
            if (activePost) {
                const updatedActive = fetchedPosts.find(p => p.id === activePost.id);
                if (updatedActive) setActivePost(updatedActive);
            }
        });

        return () => unsubscribe();
    }, [activePost]);

    // Fetch User Votes
    useEffect(() => {
        if (!user) return;
        const fetchVotes = async () => {
            const votesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'forum_votes');
            const snap = await getDocs(votesRef);
            const votes = {};
            snap.forEach(d => {
                votes[d.id] = d.data().type; // 'up' or null
            });
            setUserVotes(votes);
        };
        fetchVotes();
    }, [user]);

    // Fetch Comments for Active Post
    useEffect(() => {
        if (view === 'post' && activePost?.id) {
            const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'forums', activePost.id, 'comments');
            const q = query(commentsRef, orderBy('createdAt', 'asc'));
            
            const unsub = onSnapshot(q, (snapshot) => {
                const fetchedComments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setComments(fetchedComments);
            }, (error) => {
                console.error("Error fetching comments:", error);
            });
            return () => unsub();
        }
    }, [view, activePost?.id]);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        
        if (!checkCooldown(userData, 'forums')) return;
        
        if (!newPost.title || !newPost.content) return toast.error('Fill all fields!');
        setSubmitting(true);
        try {
            const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'forums');
            await addDoc(postsRef, {
                title: newPost.title,
                content: newPost.content,
                category: newPost.category,
                authorId: user.uid,
                authorName: userData?.name || 'Anonymous',
                authorImage: userData?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.name}`,
                upvotes: 0,
                commentCount: 0,
                createdAt: serverTimestamp()
            });

            // Karma Award
            await awardKarma(user, 5, `Created Forum Discussion: ${newPost.title}`, 'forums');
            
            setIsCreateModalOpen(false);
            setNewPost({ title: '', content: '', category: 'General' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to post');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (post) => {
        if (!user) return toast.error('Must be logged in');
        
        const hasVoted = userVotes[post.id] === 'up';
        const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'forums', post.id);
        const voteRef = doc(db, 'artifacts', appId, 'users', user.uid, 'forum_votes', post.id);

        // Optimistic Update
        setUserVotes(prev => ({ ...prev, [post.id]: hasVoted ? null : 'up' }));
        
        try {
            if (hasVoted) {
                await updateDoc(postRef, { upvotes: increment(-1) });
                await deleteDoc(voteRef);
            } else {
                await updateDoc(postRef, { upvotes: increment(1) });
                await setDoc(voteRef, { type: 'up' });
            }
        } catch (err) {
            console.error(err);
            // Revert on error
            setUserVotes(prev => ({ ...prev, [post.id]: hasVoted ? 'up' : null }));
            toast.error('Vote failed');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        
        if (!checkCooldown(userData, 'forums')) return;
        
        if (!newComment.trim()) return;
        setSubmittingComment(true);

        try {
            const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'forums', activePost.id);
            const commentsRef = collection(postRef, 'comments');

            await addDoc(commentsRef, {
                content: newComment,
                authorId: user.uid,
                authorName: userData?.name || 'Anonymous',
                authorImage: userData?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.name}`,
                createdAt: serverTimestamp()
            });

            await updateDoc(postRef, { commentCount: increment(1) });

            // Karma Award
            await awardKarma(user, 2, `Replied to Discussion`, 'forums');
            
            setNewComment('');
        } catch (err) {
            console.error(err);
            toast.error('Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeletePost = async (postId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this discussion?')) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'forums', postId));
            toast.success('Discussion deleted by Admin');
            if (activePost && activePost.id === postId) {
                setView('feed');
                setActivePost(null);
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('Failed to delete discussion');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        try {
            const commentRef = doc(db, 'artifacts', appId, 'public', 'data', 'forums', activePost.id, 'comments', commentId);
            await deleteDoc(commentRef);
            
            const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'forums', activePost.id);
            await updateDoc(postRef, { commentCount: increment(-1) });
            
            toast.success('Comment deleted');
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const filteredPosts = posts.filter(p => filter === 'All' || p.category === filter);

    if (view === 'post' && activePost) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 animate-in slide-in-from-right-4 duration-300">
                <button 
                    onClick={() => setView('feed')} 
                    className="mb-6 flex items-center gap-2 text-text-muted hover:text-text-main font-bold transition"
                >
                    <ArrowLeft className="w-5 h-5" /> Back to Forums
                </button>

                {/* Original Post */}
                <div className="bg-surface-elevated rounded-2xl border border-border-strong p-6 mb-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <img src={activePost.authorImage} alt={activePost.authorName} className="w-10 h-10 rounded-full bg-surface-highlight flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-text-main">{activePost.authorName}</span>
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    • {formatTimeAgo(activePost.createdAt)}
                                </span>
                            </div>
                            <span className="inline-block bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-3">
                                {activePost.category}
                            </span>
                            <h1 className="text-xl font-bold text-text-main mb-3">{activePost.title}</h1>
                            <p className="text-text-main whitespace-pre-wrap leading-relaxed">{activePost.content}</p>
                        </div>
                        {isSuperAdmin && (
                            <button 
                                onClick={(e) => handleDeletePost(activePost.id, e)}
                                className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition flex-shrink-0"
                                title="Admin Delete Post"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-text-main flex items-center gap-2 mb-4">
                        <MessageCircle className="w-5 h-5" /> Comments ({activePost.commentCount})
                    </h3>
                    
                    {comments.length === 0 ? (
                        <div className="text-center py-12 bg-surface-base border border-border-strong rounded-xl border-dashed">
                            <p className="text-text-muted font-medium">No replies yet. Be the first!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-surface-base p-4 rounded-xl border border-border-strong flex gap-4 group relative">
                                    <img src={comment.authorImage} alt={comment.authorName} className="w-8 h-8 rounded-full bg-surface-highlight flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-text-main">{comment.authorName}</span>
                                            <span className="text-xs text-text-muted">{formatTimeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-text-main whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                    {isSuperAdmin && (
                                        <button 
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 p-2 rounded-xl transition absolute right-4 top-2"
                                            title="Delete Comment"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reply Input */}
                <form onSubmit={handleAddComment} className="flex gap-3">
                    <img src={userData?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.name}`} alt="You" className="w-10 h-10 rounded-full flex-shrink-0 border border-border-strong" />
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a reply..."
                        className="flex-1 bg-surface-base border border-border-strong rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="bg-brand-accent text-[#111827] px-4 py-2 rounded-xl font-bold hover:bg-brand-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-main flex items-center gap-3 mb-2">
                        <MessageSquare className="w-7 h-7 text-brand-accent" />
                        Campus Forums
                    </h1>
                    <p className="text-text-muted text-sm md:text-base">Ask questions, share updates, and discuss with peers.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand-accent text-[#111827] px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition shadow-md flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" /> New Discussion
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
                {['All', 'General', 'Academics', 'Clubs'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition whitespace-nowrap ${
                            filter === f ? 'bg-surface-elevated text-text-main border border-border-strong shadow-sm' : 'text-text-muted hover:bg-surface-highlight'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Feed */}
            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-brand-accent" /></div>
            ) : filteredPosts.length === 0 ? (
                <div className="text-center py-24 bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                    <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-text-main mb-2">No discussions yet</h3>
                    <p className="text-text-muted mb-6">Be the first to start a conversation in this category!</p>
                    <button onClick={() => setIsCreateModalOpen(true)} className="text-brand-accent font-bold hover:underline">Create Post</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPosts.map(post => {
                        const hasVoted = userVotes[post.id] === 'up';
                        return (
                            <div key={post.id} className="bg-surface-elevated border border-border-strong rounded-2xl p-4 flex gap-4 hover:border-brand-accent/50 transition group cursor-pointer relative" onClick={() => { setActivePost(post); setView('post'); }}>
                                {/* Vote Column */}
                                <div className="flex flex-col items-center gap-1 min-w-[40px]" onClick={e => e.stopPropagation()}>
                                    <button 
                                        onClick={() => handleVote(post)}
                                        className={`p-1.5 rounded-lg transition ${hasVoted ? 'bg-orange-500/20 text-orange-500' : 'hover:bg-surface-highlight text-text-muted'}`}
                                    >
                                        <ThumbsUp className={`w-5 h-5 ${hasVoted ? 'fill-orange-500' : ''}`} />
                                    </button>
                                    <span className={`text-sm font-black ${hasVoted ? 'text-orange-500' : 'text-text-muted'}`}>
                                        {post.upvotes + (hasVoted ? (userVotes[post.id] !== 'up' ? 1 : 0) : 0)} 
                                        {/* Simplified optimistic display since we mutate local state directly above */}
                                    </span>
                                </div>
                                
                                {/* Content Column */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <img src={post.authorImage} alt={post.authorName} className="w-5 h-5 rounded-full" />
                                        <span className="text-xs font-bold text-text-main">{post.authorName}</span>
                                        <span className="text-xs text-text-muted">• {formatTimeAgo(post.createdAt)}</span>
                                        <span className="ml-auto bg-surface-highlight px-2 py-0.5 rounded text-[10px] font-bold text-text-muted uppercase">{post.category}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-text-main mb-1 line-clamp-1">{post.title}</h3>
                                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{post.content}</p>
                                    <div className="flex items-center gap-4 text-xs font-bold text-text-muted">
                                        <div className="flex items-center gap-1.5 hover:text-text-main transition">
                                            <MessageCircle className="w-4 h-4" /> {post.commentCount} Replies
                                        </div>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <button 
                                        onClick={(e) => handleDeletePost(post.id, e)}
                                        className="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 p-2 rounded-xl transition absolute right-4 top-4"
                                        title="Admin Delete Post"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-elevated rounded-3xl w-full max-w-lg border border-border-strong overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-border-strong">
                            <h2 className="text-xl font-bold text-text-main">New Discussion</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-text-main transition p-1 rounded-full hover:bg-surface-highlight">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePost} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Category</label>
                                <select 
                                    value={newPost.category} 
                                    onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                                    className="w-full bg-surface-base border border-border-strong rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none text-text-main"
                                >
                                    <option value="General">General Campus</option>
                                    <option value="Academics">Academics / Courses</option>
                                    <option value="Clubs">Clubs & Events</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Title</label>
                                <input 
                                    type="text" required autoFocus
                                    value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})}
                                    placeholder="What do you want to discuss?"
                                    className="w-full bg-surface-base border border-border-strong rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none text-text-main"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-2">Details</label>
                                <textarea 
                                    required rows="5"
                                    value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}
                                    placeholder="Add more details..."
                                    className="w-full bg-surface-base border border-border-strong rounded-xl p-3 focus:ring-2 focus:ring-brand-accent/50 outline-none text-text-main resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-text-muted hover:bg-surface-highlight transition">Cancel</button>
                                <button type="submit" disabled={submitting} className="bg-brand-accent text-[#111827] px-6 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition flex items-center justify-center min-w-[120px] shadow-sm">
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post to Forum'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
