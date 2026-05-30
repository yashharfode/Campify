'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Loader2, BookOpen, Clock, Calendar as CalendarIcon, Save, Plus, Trash2, Settings, AlertCircle, Copy, FileText, ChevronDown, ChevronRight, LayoutDashboard, Calendar } from 'lucide-react';
import { useBranches, DEFAULT_BRANCHES } from '../../lib/useBranches';

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AttendanceManager({ user }) {
    const { branches: BRANCHES, loadingBranches } = useBranches();
    const [selectedBranch, setSelectedBranch] = useState(DEFAULT_BRANCHES[0]);
    const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [subjects, setSubjects] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [timetable, setTimetable] = useState(
        DAYS.map(day => ({ day, slots: [] }))
    );
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        fetchMetadata();
    }, [selectedBranch, selectedSemester]);

    const fetchMetadata = async () => {
        setLoading(true);
        try {
            const docId = `${selectedBranch}_${selectedSemester}`.replace(/\//g, '-');
            const docRef = doc(db, 'artifacts', appId, 'attendance_metadata', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setSubjects(data.subjects || []);
                setStartDate(data.startDate || '');
                // Merge existing timetable with all days
                const savedTimetable = data.timetable || [];
                const mergedTimetable = DAYS.map(day => {
                    const savedDay = savedTimetable.find(t => t.day === day);
                    return savedDay || { day, slots: [] };
                });
                setTimetable(mergedTimetable);
                setHolidays(data.holidays || []);
            } else {
                setSubjects([]);
                setStartDate('');
                setTimetable(DAYS.map(day => ({ day, slots: [] })));
                setHolidays([]);
            }
        } catch (error) {
            console.error('Error fetching attendance metadata:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (subjects.length === 0) {
            toast.error('Please add at least one subject');
            return;
        }

        setSaving(true);
        try {
            const docId = `${selectedBranch}_${selectedSemester}`.replace(/\//g, '-');
            const docRef = doc(db, 'artifacts', appId, 'attendance_metadata', docId);

            await setDoc(docRef, {
                subjects,
                startDate,
                timetable,
                holidays,
                updatedAt: new Date(),
                updatedBy: user?.uid || 'Admin'
            }, { merge: true });

            toast.success('Attendance settings saved successfully!');
        } catch (error) {
            console.error('Error saving attendance metadata:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const addSubject = () => {
        setSubjects([...subjects, { id: Date.now().toString(), code: '', name: '' }]);
    };

    const updateSubject = (id, field, value) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeSubject = (id) => {
        setSubjects(subjects.filter(s => s.id !== id));
        // Also remove from timetable
        const updatedTimetable = timetable.map(day => ({
            ...day,
            slots: day.slots.filter(slot => slot.subjectId !== id)
        }));
        setTimetable(updatedTimetable);
    };

    const addSlot = (dayName) => {
        setTimetable(timetable.map(day => {
            if (day.day === dayName) {
                return {
                    ...day,
                    slots: [...day.slots, { id: Date.now().toString(), subjectId: '', time: '' }]
                };
            }
            return day;
        }));
    };

    const updateSlot = (dayName, slotId, field, value) => {
        setTimetable(timetable.map(day => {
            if (day.day === dayName) {
                return {
                    ...day,
                    slots: day.slots.map(slot => slot.id === slotId ? { ...slot, [field]: value } : slot)
                };
            }
            return day;
        }));
    };

    const removeSlot = (dayName, slotId) => {
        setTimetable(timetable.map(day => {
            if (day.day === dayName) {
                return {
                    ...day,
                    slots: day.slots.filter(slot => slot.id !== slotId)
                };
            }
            return day;
        }));
    };

    const addHoliday = () => {
        setHolidays([...holidays, { id: Date.now().toString(), date: '', reason: '' }]);
    };

    const updateHoliday = (id, field, value) => {
        setHolidays(holidays.map(h => h.id === id ? { ...h, [field]: value } : h));
    };

    const removeHoliday = (id) => {
        setHolidays(holidays.filter(h => h.id !== id));
    };

    return (
        <div className="bg-surface-base border border-border-strong rounded-2xl p-4 md:p-6 shadow-sm mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-brand-accent" />
                        Attendance Manager
                    </h2>
                    <p className="text-sm text-text-muted mt-1">Manage subjects, timetable, and holidays for attendance tracking.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="w-full md:w-auto bg-brand-accent hover:bg-brand-accent-hover text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {/* Selectors & Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 bg-surface-elevated p-4 rounded-xl border border-border-strong">
                <div>
                    <label className="block text-sm font-bold text-text-muted mb-2">Branch</label>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full bg-surface-highlight border border-border-strong rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    >
                        {loadingBranches ? (
                            <option>Loading...</option>
                        ) : (
                            BRANCHES.map(b => <option key={b} value={b}>{b}</option>)
                        )}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-text-muted mb-2">Semester</label>
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full bg-surface-highlight border border-border-strong rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    >
                        {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-text-muted mb-2">Semester Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-surface-highlight border border-border-strong rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-accent" /></div>
            ) : (
                <div className="space-y-8">
                    {/* Subjects Section */}
                    <div className="bg-surface-elevated rounded-xl border border-border-strong overflow-hidden">
                        <div className="bg-surface-highlight px-4 py-3 border-b border-border-strong flex justify-between items-center">
                            <h3 className="font-bold text-text-main flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-brand-accent" /> Subjects
                            </h3>
                            <button onClick={addSubject} className="text-sm font-bold text-brand-accent hover:text-brand-accent-hover flex items-center gap-1 bg-brand-accent/10 px-3 py-1.5 rounded-lg transition-colors">
                                <Plus className="w-4 h-4" /> Add Subject
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {subjects.length === 0 ? (
                                <p className="text-sm text-text-muted text-center py-4">No subjects added. Add subjects to build the timetable.</p>
                            ) : (
                                subjects.map((subject) => (
                                    <div key={subject.id} className="flex flex-col sm:flex-row gap-3 items-center">
                                        <div className="w-full sm:w-1/3">
                                            <input
                                                type="text"
                                                placeholder="Subject Code (e.g. CS101)"
                                                value={subject.code}
                                                onChange={(e) => updateSubject(subject.id, 'code', e.target.value)}
                                                className="w-full bg-surface-base border border-border-strong rounded-lg px-3 py-2 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none uppercase"
                                            />
                                        </div>
                                        <div className="w-full sm:flex-1">
                                            <input
                                                type="text"
                                                placeholder="Subject Name (e.g. Mathematics I)"
                                                value={subject.name}
                                                onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                                                className="w-full bg-surface-base border border-border-strong rounded-lg px-3 py-2 text-sm text-text-main focus:ring-2 focus:ring-brand-accent/50 outline-none"
                                            />
                                        </div>
                                        <button onClick={() => removeSubject(subject.id)} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Master Timetable Section */}
                    <div className="bg-surface-elevated rounded-xl border border-border-strong overflow-hidden">
                        <div className="bg-surface-highlight px-4 py-3 border-b border-border-strong">
                            <h3 className="font-bold text-text-main flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-accent" /> Master Timetable
                            </h3>
                            <p className="text-xs text-text-muted mt-1">This timetable will be used to automatically generate attendance sessions for students.</p>
                        </div>
                        <div className="p-4">
                            {subjects.length === 0 ? (
                                <div className="text-center py-6 text-sm text-text-muted flex flex-col items-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-orange-500" />
                                    Please add subjects first to create a timetable.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {timetable.map(day => (
                                        <div key={day.day} className="border border-border-strong rounded-lg overflow-hidden">
                                            <div className="bg-surface-highlight px-4 py-2 border-b border-border-strong flex justify-between items-center">
                                                <span className="font-bold text-sm text-text-main">{day.day}</span>
                                                <button onClick={() => addSlot(day.day)} className="text-xs font-bold text-brand-accent hover:text-brand-accent-hover flex items-center gap-1">
                                                    <Plus className="w-3 h-3" /> Add Class Slot
                                                </button>
                                            </div>
                                            <div className="p-3 space-y-2 bg-surface-base">
                                                {day.slots.length === 0 ? (
                                                    <p className="text-xs text-text-muted text-center py-2">No classes scheduled.</p>
                                                ) : (
                                                    day.slots.map(slot => (
                                                        <div key={slot.id} className="flex gap-2 items-center bg-surface-elevated p-2 rounded-lg border border-border-strong flex-wrap">
                                                            <input
                                                                type="time"
                                                                value={slot.time}
                                                                onChange={(e) => updateSlot(day.day, slot.id, 'time', e.target.value)}
                                                                className="bg-surface-base border border-border-strong rounded-md px-2 py-1.5 text-xs text-text-main outline-none w-auto"
                                                            />
                                                            <select
                                                                value={slot.subjectId}
                                                                onChange={(e) => updateSlot(day.day, slot.id, 'subjectId', e.target.value)}
                                                                className="flex-1 bg-surface-base border border-border-strong rounded-md px-2 py-1.5 text-xs text-text-main outline-none min-w-[120px]"
                                                            >
                                                                <option value="" disabled>Select Subject</option>
                                                                {subjects.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                                ))}
                                                            </select>
                                                            <button onClick={() => removeSlot(day.day, slot.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition ml-auto">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Holidays Section */}
                    <div className="bg-surface-elevated rounded-xl border border-border-strong overflow-hidden">
                        <div className="bg-surface-highlight px-4 py-3 border-b border-border-strong flex justify-between items-center">
                            <h3 className="font-bold text-text-main flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-accent" /> Holidays (Off-Days)
                            </h3>
                            <button onClick={addHoliday} className="text-sm font-bold text-brand-accent hover:text-brand-accent-hover flex items-center gap-1 bg-brand-accent/10 px-3 py-1.5 rounded-lg transition-colors">
                                <Plus className="w-4 h-4" /> Add Holiday
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-text-muted mb-4">Note: Weekends (Sat/Sun) might be default off depending on timetable. Explicit holidays added here will cancel any scheduled classes.</p>
                            {holidays.length === 0 ? (
                                <p className="text-sm text-text-muted text-center py-4">No specific holidays added.</p>
                            ) : (
                                holidays.map(holiday => (
                                    <div key={holiday.id} className="flex gap-3 items-center flex-wrap">
                                        <input
                                            type="date"
                                            value={holiday.date}
                                            onChange={(e) => updateHoliday(holiday.id, 'date', e.target.value)}
                                            className="bg-surface-base border border-border-strong rounded-lg px-3 py-2 text-sm text-text-main outline-none w-full sm:w-auto"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Reason (e.g. Diwali)"
                                            value={holiday.reason}
                                            onChange={(e) => updateHoliday(holiday.id, 'reason', e.target.value)}
                                            className="flex-1 min-w-[150px] bg-surface-base border border-border-strong rounded-lg px-3 py-2 text-sm text-text-main outline-none"
                                        />
                                        <button onClick={() => removeHoliday(holiday.id)} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
