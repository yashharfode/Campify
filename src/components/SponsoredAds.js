'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';

const ADS_DATA = [
    {
        id: 'ad-1',
        title: 'HAckathon',
        subtitle: 'win',
        badge: 'FEATURED',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
        desktopImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
        mobileImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
        cta: 'Learn More',
        link: 'https://example.com/hackathon'
    }
];

export default function SponsoredAds() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const bannersRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');
                const snapshot = await getDocs(bannersRef);
                const fetchedBanners = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setBanners(fetchedBanners.length > 0 ? fetchedBanners : ADS_DATA);
            } catch (error) {
                console.error("Error fetching banners:", error);
                setBanners(ADS_DATA); // Fallback
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length === 0) return;
        const timer = setInterval(() => { setCurrentIndex((prev) => (prev + 1) % banners.length); }, 4000);
        return () => clearInterval(timer);
    }, [banners]);

    if (loading) return <div className="h-[150px] md:h-[220px] bg-accent-dark rounded-2xl animate-pulse border border-[#C08457]/20" />;

    const openBannerLink = (link) => {
        if (!link) return;
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="w-full relative group rounded-3xl overflow-hidden shadow-sm border border-border-strong/40 bg-surface-elevated hover:shadow-md transition-shadow">
            <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {banners.map((ad) => (
                    <div key={ad.id} className="min-w-full flex flex-col shrink-0">
                        {/* Image Section */}
                        <div className="relative w-full overflow-hidden bg-surface-highlight aspect-[16/9] max-h-[180px] sm:max-h-[250px] md:max-h-[400px]">
                            {ad.desktopImage || ad.mobileImage || ad.image ? (
                                <picture className="w-full h-full flex items-center justify-center">
                                    {ad.desktopImage && <source media="(min-width: 768px)" srcSet={ad.desktopImage} />}
                                    <img src={ad.mobileImage || ad.desktopImage || ad.image} className="w-full h-full object-contain md:object-cover" alt={ad.title || ''} />
                                </picture>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
                            )}
                        </div>

                        {/* Info Section (Outside Banner, Tight Padding) */}
                        <div className="flex flex-row items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4 bg-surface-elevated border-t border-border-strong/20">
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                {ad.badge && (
                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-full">
                                        {ad.badge}
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-base md:text-lg font-bold font-outfit text-text-main truncate">
                                        {ad.title}
                                    </h3>
                                    {ad.subtitle && (
                                        <p className="text-xs text-text-muted truncate">
                                            {ad.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openBannerLink(ad.link)}
                                className="shrink-0 bg-brand-accent hover:bg-brand-accent-hover text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                                disabled={!ad.link}
                            >
                                {ad.cta || 'Learn More'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            {banners.length > 1 && (
                <div className="absolute top-2 right-4 flex justify-center gap-1.5 z-20 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            aria-label={`Go to slide ${i + 1}`}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-surface-elevated' : 'w-1.5 bg-surface-elevated/50 hover:bg-surface-elevated/80'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
