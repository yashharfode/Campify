import { doc, getDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, appId } from './firebase';
import toast from 'react-hot-toast';

export const checkCooldown = (userData, actionType) => {
    if (!userData) return true;

    // actionType: 'market', 'lostfound', 'notes', 'forums'
    const cooldowns = {
        'market': 1 * 60 * 1000,
        'lostfound': 1 * 60 * 1000,
        'notes': 2 * 60 * 1000,
        'forums': 5 * 60 * 1000
    };
    
    const lastAction = userData[`last_action_${actionType}`];
    if (!lastAction) return true; 
    
    // Convert Firestore Timestamp to JS Date
    const lastTime = lastAction.toDate ? lastAction.toDate().getTime() : lastAction; 
    const now = Date.now();
    const elapsed = now - lastTime;
    
    if (elapsed < cooldowns[actionType]) {
        const remainingMinutes = Math.ceil((cooldowns[actionType] - elapsed) / 60000);
        toast.error(`Anti-Spam: Please wait ${remainingMinutes} min before posting again.`);
        return false;
    }
    return true;
};

export const awardKarma = async (user, amount, reason, actionType) => {
    if (!user || !user.uid) return;
    
    try {
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        
        // Get fresh user data to ensure daily karma is accurate
        const userSnap = await getDoc(userRef);
        let freshUserData = userSnap.exists() ? userSnap.data() : {};
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let currentDaily = freshUserData.dailyKarma || 0;
        let lastDate = freshUserData.lastKarmaDate || '';
        
        if (lastDate !== today) {
            currentDaily = 0; // Reset for new day
        }
        
        const updates = {
            lastKarmaDate: today
        };
        
        if (actionType) {
            updates[`last_action_${actionType}`] = serverTimestamp();
        }
        
        const isAdmin = ['yash.harfode.sati@gmail.com', 'yashharfode123@gmail.com'].includes(user.email);
        
        let status = 'pending';
        // Auto approve if under 50 daily limit OR if user is SuperAdmin
        if (currentDaily + amount <= 50 || isAdmin) { 
            status = 'approved';
            updates.karma = increment(amount);
            updates.dailyKarma = currentDaily + amount;
        } else {
            // Still update the last action timestamp, but karma remains pending
            updates.dailyKarma = currentDaily; 
        }
        
        await updateDoc(userRef, updates);
        
        // Log it for admin review
        await addDoc(collection(db, 'artifacts', appId, 'karma_logs'), {
            userId: user.uid,
            userName: freshUserData.name || 'Anonymous',
            userEmail: user.email || '',
            amount: amount,
            reason: reason,
            status: status,
            createdAt: serverTimestamp()
        });
        
        if (status === 'approved') {
            toast.success(`✨ +${amount} Karma! (${reason})`, { icon: '🔥' });
        } else {
            toast.success(`Post submitted! +${amount} Karma is pending admin approval (Daily Limit Reached).`);
        }
        
    } catch (error) {
        console.error("Error awarding karma:", error);
    }
};
