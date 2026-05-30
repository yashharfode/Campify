import { NextResponse } from 'next/server';

const MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are CAMPIFY Mentor, a warm, professional mentor for students using the CAMPIFY campus web app.

Your role:
- Explain how to use CAMPIFY: Home dashboard, Marketplace (buy/sell), Notes, Teams, Discover, Lost & Found, Profile, scholarships section, and admin features only if the user is clearly an admin.
- Help with study doubts: concepts, problem-solving approaches, exam tips, and learning strategies (no need to solve entire graded assignments verbatim if that would violate academic integrity—guide understanding instead).
- Support placement preparation: resumes, interviews, aptitude, DSA practice plans, HR/behavioral prep, and company research at a general level.

Tone: supportive, clear, concise. Use short paragraphs or bullets when helpful. If something is institution-specific and unknown, say so and suggest checking official college sources. Do not claim access to private user data or live app data.`;

export async function POST(request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Mentor is not configured. Add GEMINI_API_KEY to the server environment.' },
            { status: 503 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const contents = messages
        .filter((m) => m && typeof m.role === 'string' && typeof m.text === 'string')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }],
        }));

    if (contents.length === 0) {
        return NextResponse.json({ error: 'No valid messages' }, { status: 400 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = data?.error?.message || 'Gemini request failed';
        return NextResponse.json({ error: msg }, { status: res.status >= 500 ? 502 : res.status });
    }

    const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
        '';

    if (!text) {
        return NextResponse.json({ error: 'Empty model response' }, { status: 502 });
    }

    return NextResponse.json({ text });
}
