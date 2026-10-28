// Vercel serverless function: LeemAI -> Google Gemini (Google AI Studio key).
// Env vars (Vercel -> Settings -> Environment Variables):
//   GEMINI_API_KEY  (required)   your Google AI Studio key
//   GEMINI_MODEL    (optional)   default: gemini-2.5-flash
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM = `You are LeemAI, the study assistant of StudyLeem (studyleem.vercel.app), for students of FBISE (Federal Board, Pakistan), Classes 9-12.
- Help with Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Islamiat and Pakistan Studies at FBISE level.
- Explain simply and accurately, step by step, in the language the student uses (English, Urdu or Roman Urdu).
- For numerical problems show the formula, substitution and final answer with units.
- Keep answers focused (usually under 250 words). Use short paragraphs, **bold** for key terms, and simple lists starting with "- " or "1.". Do not use tables or # headings.
- If a question is not about studies or school subjects, politely steer back to studying.
- If you are unsure, say so rather than guessing. Never invent exam papers, page numbers or past-paper years.
- You may suggest the student check the matching chapter notes on StudyLeem.`;

// best-effort per-instance rate limit (resets on cold start)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60_000, max = 12;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // health check: open /api/ask in the browser to see if the function is live and the key is set
  if (req.method === 'GET') return res.status(200).json({ status: 'ok', configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  // only accept calls coming from your own site (and local dev)
  const origin = req.headers.origin || '';
  if (origin) {
    let host = ''; try { host = new URL(origin).hostname; } catch (_) {}
    const ok = host === req.headers.host.split(':')[0] || host === 'localhost';
    if (!ok) return res.status(403).json({ detail: 'Forbidden' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ detail: 'LeemAI is not configured yet (missing GEMINI_API_KEY).' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ detail: 'Too many questions. Please wait a minute and try again.' });

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (_) { return {}; } })() : (req.body || {});
  const question = String(body.question || '').trim().slice(0, 1500);
  if (!question) return res.status(400).json({ detail: 'Please type a question.' });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      })
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error('Gemini error', r.status, JSON.stringify(data).slice(0, 500));
      const msg = r.status === 429 ? 'LeemAI is busy right now. Please try again in a minute.'
        : (r.status === 400 || r.status === 403) ? 'LeemAI could not be reached (check the API key / model name in Vercel).'
        : 'LeemAI had a problem. Please try again.';
      return res.status(502).json({ detail: msg });
    }
    const cand = data.candidates && data.candidates[0];
    const text = cand && cand.content && cand.content.parts ? cand.content.parts.map(p => p.text || '').join('').trim() : '';
    if (!text) {
      const blocked = data.promptFeedback && data.promptFeedback.blockReason;
      return res.status(200).json({ answer: blocked ? 'Sorry, I can\'t help with that question. Please ask something about your studies.' : 'I could not produce an answer. Please rephrase your question.', model_ready: true, confidence: 0 });
    }
    return res.status(200).json({ answer: text, model_ready: true, confidence: 0 });
  } catch (e) {
    console.error('LeemAI error', e);
    return res.status(502).json({ detail: 'LeemAI had a problem. Please try again.' });
  }
};
