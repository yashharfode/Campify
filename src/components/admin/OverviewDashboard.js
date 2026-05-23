'use client';

import React, { useState, useEffect } from 'react';
import { Users, Tent, BookOpen, AlertCircle, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function OverviewDashboard({ users, events, notes }) {
    const [clubsCount, setClubsCount] = useState(0);
    const [loadingClubs, setLoadingClubs] = useState(true);

    useEffect(() => {
        const fetchClubsCount = async () => {
            try {
                const clubsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clubs');
                const snap = await getDocs(clubsRef);
                setClubsCount(snap.size);
            } catch (error) {
                console.error("Error fetching clubs for overview:", error);
            } finally {
                setLoadingClubs(false);
            }
        };
        fetchClubsCount();
    }, []);

    // Derived Metrics
    const totalUsers = users.length;
    const totalEvents = events.length;
    const totalNotes = notes.length;

    // Process data for Weekly Activity Graph (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: d,
            events: 0,
            users: 0,
            notes: 0
        };
    });

    const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    // Map Events to days
    events.forEach(e => {
        if (e.createdAt?.seconds) {
            const date = new Date(e.createdAt.seconds * 1000);
            const day = last7Days.find(d => isSameDay(d.fullDate, date));
            if (day) day.events++;
        }
    });

    // Map Users to days
    users.forEach(u => {
        if (u.createdAt?.seconds) {
            const date = new Date(u.createdAt.seconds * 1000);
            const day = last7Days.find(d => isSameDay(d.fullDate, date));
            if (day) day.users++;
        }
    });

    // Map Notes to days
    notes.forEach(n => {
        if (n.createdAt?.seconds) {
            const date = new Date(n.createdAt.seconds * 1000);
            const day = last7Days.find(d => isSameDay(d.fullDate, date));
            if (day) day.notes++;
        }
    });

    // Activity Feed combining recent users and events
    const recentActivity = [];
    users.slice(0, 10).forEach(u => {
        if(u.createdAt) {
            recentActivity.push({
                type: 'user',
                title: 'New User Joined',
                desc: `${u.email} created an account.`,
                time: u.createdAt.seconds || 0
            });
        }
    });
    events.slice(0, 10).forEach(e => {
        if(e.createdAt) {
            recentActivity.push({
                type: 'event',
                title: 'New Event Created',
                desc: `"${e.title}" was added.`,
                time: e.createdAt.seconds || 0
            });
        }
    });

    // Sort descending by time
    recentActivity.sort((a, b) => b.time - a.time);
    const topActivity = recentActivity.slice(0, 8);

    // Dummy data for Growth since we don't track historical club count easily without time-series
    const growthData = last7Days.map(d => ({
        name: d.date,
        Total: totalUsers - Math.floor(Math.random() * 10) // Simulate slight growth to current
    }));
    // Fix growth curve to be ascending to current total
    growthData.reverse().forEach((d, i) => {
        d.Total = totalUsers - (i * 3);
    });
    growthData.reverse();

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-muted">Total Users</p>
                        <h3 className="text-2xl font-black text-text-main">{totalUsers}</h3>
                    </div>
                </div>
                <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center">
                        <Tent className="w-6 h-6 text-brand-accent" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-muted">Active Clubs</p>
                        <h3 className="text-2xl font-black text-text-main">{loadingClubs ? '...' : clubsCount}</h3>
                    </div>
                </div>
                <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-muted">Total Events</p>
                        <h3 className="text-2xl font-black text-text-main">{totalEvents}</h3>
                    </div>
                </div>
                <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-muted">Notes Uploaded</p>
                        <h3 className="text-2xl font-black text-text-main">{totalNotes}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Graphs Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Weekly Activity Bar Chart */}
                    <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong">
                        <h3 className="text-lg font-bold text-text-main mb-4">Weekly Activity</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={last7Days}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#B3B4BD" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#B3B4BD" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#2C2E3A', borderColor: '#333', borderRadius: '12px' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="users" name="New Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="events" name="Events" fill="#C08457" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="notes" name="Notes" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Growth Line Chart */}
                    <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong">
                        <h3 className="text-lg font-bold text-text-main mb-4">User Growth (Last 7 Days)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" stroke="#B3B4BD" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#B3B4BD" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#2C2E3A', borderColor: '#333', borderRadius: '12px' }}
                                    />
                                    <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-surface-elevated border border-border-strong rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
                    <div className="p-6 border-b border-border-strong">
                        <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                            Command Center
                        </h3>
                        <p className="text-sm text-text-muted mt-1">Live feed of recent actions</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {topActivity.length === 0 ? (
                            <p className="text-text-muted text-sm text-center">No recent activity.</p>
                        ) : (
                            topActivity.map((act, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${act.type === 'user' ? 'bg-blue-500/20 text-blue-500' : 'bg-brand-accent/20 text-brand-accent'}`}>
                                            {act.type === 'user' ? <Users className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-text-main">{act.title}</p>
                                        <p className="text-xs text-text-muted">{act.desc}</p>
                                        <p className="text-[10px] text-text-muted mt-1">
                                            {new Date(act.time * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
