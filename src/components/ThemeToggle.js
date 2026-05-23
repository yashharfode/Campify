'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import { Moon, Sun, BookOpen, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    
    // Click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-full bg-surface-highlight animate-pulse" />;
  }

  const themes = [
    { id: 'light', name: 'Premium Beige', icon: Sun },
    { id: 'dark', name: 'OLED Black', icon: Moon },
    { id: 'zen', name: 'Zen Minimal', icon: BookOpen },
    { id: 'system', name: 'System', icon: Monitor }
  ];

  const currentThemeIcon = themes.find(t => t.id === theme)?.icon || Sun;
  const CurrentIcon = currentThemeIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-surface-base border border-border-strong hover:bg-surface-highlight transition-all text-text-muted hover:text-text-main focus:outline-none shadow-sm hover:shadow-md"
        aria-label="Toggle theme"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-48 bg-surface-elevated/90 backdrop-blur-xl border border-border-strong rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 flex flex-col gap-0.5">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-brand-accent/10 text-brand-accent font-bold' 
                      : 'text-text-muted hover:bg-surface-highlight hover:text-text-main'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-accent' : ''}`} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
