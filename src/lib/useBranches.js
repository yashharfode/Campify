import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, appId } from './firebase';

export const DEFAULT_BRANCHES = [
    'Computer Science (CSE)',
    'Information Technology (IT)',
    'Electronics (ECE)',
    'Electrical (EE)',
    'Mechanical (ME)',
    'Civil (CE)',
    'First Year (Common)'
];

export function useBranches() {
    const [branches, setBranches] = useState(DEFAULT_BRANCHES);
    const [loadingBranches, setLoadingBranches] = useState(true);

    const fetchBranches = async () => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'metadata_branches');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().branches) {
                setBranches(docSnap.data().branches);
            } else {
                setBranches(DEFAULT_BRANCHES);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
            setBranches(DEFAULT_BRANCHES);
        } finally {
            setLoadingBranches(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    return { branches, loadingBranches, refreshBranches: fetchBranches };
}
