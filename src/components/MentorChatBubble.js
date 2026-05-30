'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';

const INITIAL_ASSISTANT =
    "Hi — I'm your CAMPIFY Mentor. Ask me about the app, study topics, or placement prep.";

export default function MentorChatBubble() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([{ role: 'assistant', text: INITIAL_ASSISTANT }]);
    const listRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, open, loading]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const send = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const nextUser = { role: 'user', text: trimmed };
        setInput('');
        setMessages((prev) => [...prev, nextUser]);
        setLoading(true);

        try {
            const history = [...messages, nextUser].map((m) => ({
                role: m.role,
                text: m.text,
            }));

            const res = await fetch('/api/mentor-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setMessages((prev) => [...prev, { role: 'assistant', text: data.text }]);
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    text: e.message || 'Could not reach Mentor. Try again in a moment.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Bubble-drop FAB — teardrop silhouette */}
            <button
                type="button"
                aria-label="Open CAMPIFY Mentor"
                onClick={() => setOpen(true)}
                className={`fixed z-[55] flex h-14 w-14 items-center justify-center text-[#111827] shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_40px_-12px_rgba(28,25,23,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 md:right-8 ${
                    open ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'
                } right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-8`}
                style={{
                    borderRadius: '50% 50% 50% 50% / 55% 55% 45% 45%',
                    background: 'linear-gradient(145deg, #292524 0%, #1c1917 45%, #44403c 100%)',
                }}
            >
                <Sparkles className="h-6 w-6 opacity-95" strokeWidth={1.75} />
            </button>

            {open && (
                <div className="fixed inset-0 z-[56]" aria-hidden={false}>
                    <div
                        className="absolute inset-0 bg-stone-900/25 backdrop-blur-[2px]"
                        role="presentation"
                        onClick={() => setOpen(false)}
                    />
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:items-end md:pb-8 md:pr-8">
                    <div
                        className="pointer-events-auto flex max-h-[min(72vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-border-strong/90 bg-surface-elevated/95 shadow-2xl backdrop-blur-md ring-1 ring-black/5"
                        style={{
                            borderRadius: '1.75rem 1.75rem 1.25rem 1.75rem',
                        }}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-stone-900 to-stone-800 px-4 py-3 text-[#111827]">
                            <div className="flex items-center gap-2 min-w-0">
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center bg-surface-elevated/10"
                                    style={{ borderRadius: '50% 50% 50% 50% / 55% 55% 45% 45%' }}
                                >
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">CAMPIFY Mentor</p>
                                    <p className="text-[11px] text-stone-300 truncate">
                                        Study · placement · app help
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-full p-2 hover:bg-surface-elevated/10 transition"
                                aria-label="Close mentor chat"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div
                            ref={listRef}
                            className="flex-1 min-h-[200px] overflow-y-auto px-4 py-3 space-y-3 bg-stone-50/80"
                        >
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                                            m.role === 'user'
                                                ? 'rounded-br-md bg-stone-900 text-[#111827]'
                                                : 'rounded-bl-md border border-border-strong/80 bg-surface-elevated text-stone-800'
                                        }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border-strong/80 bg-surface-elevated px-3 py-2 text-stone-500 text-sm">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Thinking…
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-stone-100 bg-surface-elevated p-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                                    placeholder="Ask your mentor…"
                                    className="min-w-0 flex-1 rounded-full border border-border-strong bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-stone-300/50"
                                />
                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={loading || !input.trim()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[#111827] shadow-md transition hover:bg-stone-800 disabled:opacity-40"
                                    aria-label="Send message"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </>
    );
}
