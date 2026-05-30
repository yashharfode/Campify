'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Loader2, Calendar, CheckCircle, XCircle, AlertCircle, Edit2, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { useBranches, DEFAULT_BRANCHES } from '../lib/useBranches';

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AttendanceTracker({ user, userData }) {
    const { branches: BRANCHES, loadingBranches } = useBranches();
    const [branch, setBranch] = useState(userData?.branch || DEFAULT_BRANCHES[0]);
    const [semester, setSemester] = useState(userData?.semester || SEMESTERS[0]);
    
    const [metadata, setMetadata] = useState(null);
    const [records, setRecords] = useState({}); // { "YYYY-MM-DD": { "slotId": { status, customSubjectId } } }
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Selected Date for viewing/marking
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (user) {
            fetchAttendanceData();
        }
    }, [branch, semester, user]);

    const fetchAttendanceData = async () => {
        setLoading(true);
        try {
            const metaId = `${branch}_${semester}`.replace(/\//g, '-');
            const metaRef = doc(db, 'artifacts', appId, 'attendance_metadata', metaId);
            const metaSnap = await getDoc(metaRef);
            
            let metaData = null;
            if (metaSnap.exists()) {
                metaData = metaSnap.data();
                setMetadata(metaData);
            } else {
                setMetadata(null);
            }

            const recordRef = doc(db, 'artifacts', appId, 'users', user.uid, 'attendance_records', metaId);
            const recordSnap = await getDoc(recordRef);
            if (recordSnap.exists()) {
                setRecords(recordSnap.data().records || {});
            } else {
                setRecords({});
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRecords = async (newRecords) => {
        setSaving(true);
        try {
            const metaId = `${branch}_${semester}`.replace(/\//g, '-');
            const recordRef = doc(db, 'artifacts', appId, 'users', user.uid, 'attendance_records', metaId);
            await setDoc(recordRef, { records: newRecords, updatedAt: new Date() }, { merge: true });
            setRecords(newRecords);
            toast.success('Attendance updated!');
        } catch (error) {
            console.error('Error saving records:', error);
            toast.error('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const updateSlotStatus = (slotId, status) => {
        const dateRecs = records[selectedDate] || {};
        const newRecords = {
            ...records,
            [selectedDate]: {
                ...dateRecs,
                [slotId]: { ...(dateRecs[slotId] || {}), status }
            }
        };
        handleSaveRecords(newRecords);
    };

    const updateCustomSubject = (slotId, subjectId) => {
        const dateRecs = records[selectedDate] || {};
        const newRecords = {
            ...records,
            [selectedDate]: {
                ...dateRecs,
                [slotId]: { ...(dateRecs[slotId] || {}), customSubjectId: subjectId || null }
            }
        };
        handleSaveRecords(newRecords);
    };

    // Calculate Stats
    const calculateStats = () => {
        if (!metadata || !metadata.startDate) return null;
        
        const stats = {};
        metadata.subjects.forEach(sub => {
            stats[sub.id] = { id: sub.id, name: sub.name, code: sub.code, held: 0, present: 0, absent: 0, excused: 0 };
        });

        const start = new Date(metadata.startDate);
        const today = new Date();
        const end = today; // Calculate up to today

        const holidayStrings = (metadata.holidays || []).map(h => h.date);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (holidayStrings.includes(dateStr)) continue;

            const dayName = DAYS[d.getDay()];
            const dayTimetable = (metadata.timetable || []).find(t => t.day === dayName);
            if (!dayTimetable || dayTimetable.slots.length === 0) continue;

            const dayRecords = records[dateStr] || {};

            dayTimetable.slots.forEach(slot => {
                const rec = dayRecords[slot.id] || {};
                const subjectId = rec.customSubjectId || slot.subjectId;
                
                if (stats[subjectId]) {
                    stats[subjectId].held += 1;
                    if (rec.status === 'present') stats[subjectId].present += 1;
                    else if (rec.status === 'absent') stats[subjectId].absent += 1;
                    else if (rec.status === 'excused') stats[subjectId].excused += 1;
                }
            });
        }

        let totalHeld = 0;
        let totalPresent = 0;
        Object.values(stats).forEach(s => {
            totalHeld += s.held;
            totalPresent += s.present;
            s.percentage = s.held > 0 ? ((s.present / s.held) * 100).toFixed(1) : 0;
        });

        const overallPercentage = totalHeld > 0 ? ((totalPresent / totalHeld) * 100).toFixed(1) : 0;
        
        let safeBunks = 0;
        let neededClasses = 0;

        if (totalHeld > 0) {
            const threshold = 0.75;
            if (totalPresent / totalHeld >= threshold) {
                safeBunks = Math.floor((totalPresent - (threshold * totalHeld)) / threshold);
            } else {
                neededClasses = Math.ceil((threshold * totalHeld - totalPresent) / (1 - threshold));
            }
        }
        
        return { subjectStats: Object.values(stats), totalHeld, totalPresent, overallPercentage, safeBunks, neededClasses };
    };

    const stats = calculateStats();

    // Motivational logic
    const getMotivation = (percentage) => {
        if (percentage >= 85) return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', text: "Amazing consistency! Keep this streak alive, you're doing great!", icon: <Award className="w-5 h-5 text-green-500" /> };
        if (percentage >= 75) return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: "You're on the edge! Push a little harder to cross the 85% mark. Every class counts!", icon: <TrendingUp className="w-5 h-5 text-orange-500" /> };
        return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', text: "Don't let your attendance hold you back! Time to start showing up and making it count. You can do this!", icon: <TrendingDown className="w-5 h-5 text-red-500" /> };
    };

    const motivation = stats ? getMotivation(parseFloat(stats.overallPercentage)) : null;

    // Current Day Timetable
    const selectedDateObj = new Date(selectedDate);
    const selectedDayName = DAYS[selectedDateObj.getDay()];
    const selectedDayTimetable = metadata?.timetable?.find(t => t.day === selectedDayName);
    const isHoliday = metadata?.holidays?.some(h => h.date === selectedDate);
    const holidayReason = metadata?.holidays?.find(h => h.date === selectedDate)?.reason;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Selectors */}
            <div className="bg-surface-elevated p-4 md:p-6 rounded-2xl border border-border-strong flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-brand-accent" />
                        Attendance Tracker
                    </h2>
                    <p className="text-sm text-text-muted mt-1">Track your classes and maintain your streak.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="bg-surface-base border border-border-strong rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    >
                        {loadingBranches ? (
                            <option>Loading...</option>
                        ) : (
                            BRANCHES.map(b => <option key={b} value={b}>{b}</option>)
                        )}
                    </select>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="bg-surface-base border border-border-strong rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    >
                        {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-accent" /></div>
            ) : !metadata ? (
                <div className="text-center py-16 bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                    <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-text-main mb-2">No Timetable Found</h3>
                    <p className="text-text-muted">The admin hasn't set up the attendance metadata for this branch and semester yet.</p>
                </div>
            ) : !metadata.startDate ? (
                <div className="text-center py-16 bg-surface-elevated rounded-2xl border border-dashed border-border-strong">
                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-text-main mb-2">Semester Start Date Missing</h3>
                    <p className="text-text-muted">Attendance calculations cannot be performed because the semester start date is missing. Contact Admin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Stats & Motivation */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Overall Stats */}
                        <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong shadow-sm text-center">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Overall Attendance</h3>
                            <div className="relative inline-flex items-center justify-center w-40 h-40 mb-4">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-surface-highlight"
                                        strokeWidth="3"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={motivation.color.replace('text-', 'stroke-')}
                                        strokeWidth="3"
                                        strokeDasharray={`${stats.overallPercentage}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-black ${motivation.color}`}>{stats.overallPercentage}%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-surface-base p-3 rounded-xl border border-border-strong">
                                    <p className="text-xs text-text-muted font-bold">Total Held</p>
                                    <p className="text-lg font-black text-text-main">{stats.totalHeld}</p>
                                </div>
                                <div className="bg-surface-base p-3 rounded-xl border border-border-strong">
                                    <p className="text-xs text-text-muted font-bold">Attended</p>
                                    <p className="text-lg font-black text-text-main">{stats.totalPresent}</p>
                                </div>
                            </div>
                        </div>

                        {/* Motivation */}
                        <div className={`${motivation.bg} border ${motivation.border} p-5 rounded-2xl flex items-start gap-3`}>
                            <div className="mt-0.5">{motivation.icon}</div>
                            <p className={`text-sm font-bold ${motivation.color} leading-relaxed`}>{motivation.text}</p>
                        </div>

                        {/* Bunk Meter */}
                        {stats.totalHeld > 0 && (
                            <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong shadow-sm">
                                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4" /> Bunk Meter (75% Req)
                                </h3>
                                {stats.safeBunks > 0 ? (
                                    <div className="bg-green-500/10 border-2 border-green-500/20 rounded-xl p-4 text-center">
                                        <p className="text-3xl font-black text-green-500 mb-1">{stats.safeBunks}</p>
                                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Safe Bunks</p>
                                        <p className="text-xs text-text-muted mt-2">You can safely skip this many classes and stay above 75%.</p>
                                    </div>
                                ) : stats.neededClasses > 0 ? (
                                    <div className="bg-red-500/10 border-2 border-red-500/20 rounded-xl p-4 text-center">
                                        <p className="text-3xl font-black text-red-500 mb-1">{stats.neededClasses}</p>
                                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Classes Needed</p>
                                        <p className="text-xs text-text-muted mt-2">You must attend this many consecutive classes to reach 75%.</p>
                                    </div>
                                ) : (
                                    <div className="bg-orange-500/10 border-2 border-orange-500/20 rounded-xl p-4 text-center">
                                        <p className="text-3xl font-black text-orange-500 mb-1">0</p>
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Zero Margin</p>
                                        <p className="text-xs text-text-muted mt-2">You are exactly at 75%. Don't miss the next class!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Date Selection & Subject Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Daily Marking */}
                        <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-brand-accent" /> Mark Attendance
                                </h3>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]} // Max today
                                    className="bg-surface-base border border-border-strong rounded-xl px-4 py-2 text-sm font-bold text-text-main outline-none focus:ring-2 focus:ring-brand-accent/50"
                                />
                            </div>

                            {isHoliday ? (
                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 p-4 rounded-xl flex items-center gap-3">
                                    <Calendar className="w-5 h-5" />
                                    <div>
                                        <p className="font-bold">Holiday: {holidayReason || 'Off Day'}</p>
                                        <p className="text-sm opacity-80">No classes are scheduled for this date.</p>
                                    </div>
                                </div>
                            ) : !selectedDayTimetable || selectedDayTimetable.slots.length === 0 ? (
                                <div className="bg-surface-base border border-border-strong p-4 rounded-xl text-center text-text-muted">
                                    No classes scheduled for {selectedDayName}.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDayTimetable.slots.map(slot => {
                                        const rec = records[selectedDate]?.[slot.id] || {};
                                        const defaultSubject = metadata.subjects.find(s => s.id === slot.subjectId);
                                        const currentSubjectId = rec.customSubjectId || slot.subjectId;
                                        const currentSubject = metadata.subjects.find(s => s.id === currentSubjectId);

                                        return (
                                            <div key={slot.id} className="bg-surface-base border border-border-strong p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-brand-accent mb-1">{slot.time}</p>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={currentSubjectId}
                                                            onChange={(e) => updateCustomSubject(slot.id, e.target.value === slot.subjectId ? null : e.target.value)}
                                                            className="font-bold text-text-main bg-transparent border-b border-dashed border-border-strong focus:border-brand-accent outline-none pb-0.5"
                                                        >
                                                            {metadata.subjects.map(s => (
                                                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                            ))}
                                                        </select>
                                                        {rec.customSubjectId && (
                                                            <span className="text-[10px] bg-surface-highlight px-2 py-0.5 rounded text-text-muted font-bold">Substituted</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex bg-surface-highlight rounded-lg p-1">
                                                    <button
                                                        onClick={() => updateSlotStatus(slot.id, 'present')}
                                                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${rec.status === 'present' ? 'bg-green-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => updateSlotStatus(slot.id, 'absent')}
                                                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${rec.status === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                                                    >
                                                        Absent
                                                    </button>
                                                    <button
                                                        onClick={() => updateSlotStatus(slot.id, 'excused')}
                                                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${rec.status === 'excused' ? 'bg-orange-500 text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                                                    >
                                                        Excused
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Subject breakdown */}
                        <div className="bg-surface-elevated p-6 rounded-2xl border border-border-strong shadow-sm overflow-x-auto">
                            <h3 className="font-bold text-lg text-text-main mb-4">Subject Breakdown</h3>
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-border-strong text-text-muted text-xs uppercase tracking-wider">
                                        <th className="pb-3 font-bold">Subject</th>
                                        <th className="pb-3 font-bold text-center">Held</th>
                                        <th className="pb-3 font-bold text-center">Present</th>
                                        <th className="pb-3 font-bold text-center">Absent</th>
                                        <th className="pb-3 font-bold text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.subjectStats.map(s => (
                                        <tr key={s.id} className="border-b border-border-strong/50 last:border-0">
                                            <td className="py-3">
                                                <p className="font-bold text-text-main text-sm">{s.name}</p>
                                                <p className="text-xs text-text-muted">{s.code}</p>
                                            </td>
                                            <td className="py-3 text-center text-sm text-text-main font-medium">{s.held}</td>
                                            <td className="py-3 text-center text-sm text-green-500 font-bold">{s.present}</td>
                                            <td className="py-3 text-center text-sm text-red-500 font-bold">{s.absent}</td>
                                            <td className="py-3 text-right">
                                                <span className={`text-sm font-black px-2 py-1 rounded bg-surface-base border ${s.percentage >= 85 ? 'text-green-500 border-green-500/20' : s.percentage >= 75 ? 'text-orange-500 border-orange-500/20' : 'text-red-500 border-red-500/20'}`}>
                                                    {s.percentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
