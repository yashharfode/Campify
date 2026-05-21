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

    if (loading) return <div className="h-[150px] md:h-[220px] bg-accent-dark rounded-2xl animate-pulse border border-[#2D5A27]/20" />;

    const openBannerLink = (link) => {
        if (!link) return;
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="w-full relative group">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xl font-bold text-text-main flex items-center gap-2"><Megaphone className="w-5 h-5 text-brand-accent" /> Sponsored</h3>
                <span className="text-xs text-text-muted font-medium">Ads by Admin</span>
            </div>
            <div className="relative overflow-hidden rounded-2xl shadow-lg border border-border-strong bg-surface-base">
                <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                    {banners.map((ad) => (
                        <div key={ad.id} className="min-w-full flex flex-col shrink-0">
                            <div className="relative w-full overflow-hidden bg-accent-dark h-[150px] md:h-[220px]">
                                {ad.desktopImage || ad.mobileImage || ad.image ? (
                                    <picture>
                                        {ad.desktopImage && <source media="(min-width: 768px)" srcSet={ad.desktopImage} />}
                                        <img src={ad.mobileImage || ad.desktopImage || ad.image} className="w-full h-full object-cover" alt={ad.title || ''} />
                                    </picture>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
                                )}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                            </div>
                            <div className="relative border-t border-border-strong bg-gradient-to-b from-[#1C1917] to-[#121212] px-4 py-4 md:px-7 md:py-6">
                                <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2D5A27]/60 to-transparent" aria-hidden />
                                <div className="flex flex-row items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {ad.badge && (
                                            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B645A] mb-1">
                                                {ad.badge}
                                            </span>
                                        )}
                                        <h3 className="text-lg md:text-2xl font-extrabold text-text-main leading-tight tracking-tight mb-1 truncate md:whitespace-normal">
                                            {ad.title}
                                        </h3>
                                        {ad.subtitle && (
                                            <p className="text-xs md:text-[15px] text-text-muted leading-relaxed line-clamp-2 md:line-clamp-none max-w-2xl">
                                                {ad.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openBannerLink(ad.link)}
                                        className="flex-shrink-0 inline-flex items-center justify-center bg-brand-accent text-white px-4 py-2.5 md:px-6 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide hover:bg-[#386d31] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!ad.link}
                                        title={ad.link ? 'Open banner link' : 'No link configured for this banner'}
                                    >
                                        {ad.cta || 'Learn More'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {banners.length > 1 && (
                    <div className="flex justify-center gap-1.5 py-3 border-t border-border-strong bg-surface-base/80">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Go to slide ${i + 1}`}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-accent-dark' : 'w-1.5 bg-stone-300 hover:bg-stone-400'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
