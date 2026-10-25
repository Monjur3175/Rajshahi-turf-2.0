import { useEffect, useRef, useState } from "react";
import CalButtons from "./CalButtons.jsx";
import { api } from "../lib.js";

const T = {
  en: { hi: "Hi, welcome to Rajshahi Turf 2.0. How can I help you?", ph: "Type your message…",
        quick: ["Book a 5-a-side tonight", "Show 7-a-side prices", "Cancel my booking"] },
  bn: { hi: "আসসালামু আলাইকুম, রাজশাহী টার্ফ ২.০-তে স্বাগতম। কীভাবে সাহায্য করতে পারি?", ph: "আপনার বার্তা লিখুন…",
        quick: ["আজ রাতে ৫-এ-সাইড বুক করতে চাই", "৭-এ-সাইডের দাম কত?", "বুকিং বাতিল করুন"] },
};

const SpeechRec = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function Chat({ onBooking }) {
  const [lang, setLang] = useState("en");
  const [msgs, setMsgs] = useState([{ id: 0, who: "bot", text: T.en.hi }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [listening, setListening] = useState(false);
  const sid = useRef(crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
  const nextId = useRef(1);
  const box = useRef(null);
  const inputEl = useRef(null);

  useEffect(() => { box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  function changeLang(l) {
    if (l === lang) return;
    setLang(l);
    setMsgs((m) => [...m, { id: nextId.current++, who: "bot", text: T[l].hi }]);
  }

  function speak(text) {
    if (!speakOn || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "bn" ? "bn-BD" : "en-US";
    speechSynthesis.speak(u);
  }

  function toggleSpeak() {
    const next = !speakOn;
    setSpeakOn(next);
    if (!next && window.speechSynthesis) speechSynthesis.cancel();
  }

  function listen() {
    const r = new SpeechRec();
    r.lang = lang === "bn" ? "bn-BD" : "en-US";
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onresult = (e) => send(e.results[0][0].transcript);
    r.start();
  }

  async function send(raw) {
    const text = raw.trim();
    if (!text || busy) return;
    const id = nextId.current;
    nextId.current += 2;
    setMsgs((m) => [...m, { id, who: "me", text }, { id: id + 1, who: "bot", text: "…" }]);
    setInput("");
    setBusy(true);
    const patch = (p) => setMsgs((m) => m.map((x) => (x.id === id + 1 ? { ...x, ...p } : x)));
    try {
      const r = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid.current, message: text, lang }),
      });
      patch({ text: r.reply || "…", booking: r.booking || null });
      speak(r.reply);
      if (r.booking) onBooking(r.booking);
    } catch (e) {
      patch({ text: e.message, err: true });
    }
    setBusy(false);
    setTimeout(() => inputEl.current && inputEl.current.focus(), 50);
  }

  return (
    <div className="chatbox" role="region" aria-label="Chat with the booking assistant">
      <div className="chead">
        <svg width="34" height="34" viewBox="0 0 30 30" fill="none" stroke="#ffd36b" strokeWidth="2" aria-hidden="true">
          <circle cx="15" cy="15" r="13" /><path d="M8 17c2 4 12 4 14 0M10 11h.01M20 11h.01" strokeLinecap="round" strokeWidth="2.6" />
        </svg>
        <div><b>Booking assistant</b><small>Replies in English or Bangla</small></div>
        <div className="lang">
          <button className="pill" type="button" aria-pressed={lang === "en"} onClick={() => changeLang("en")}>EN</button>
          <button className="pill" type="button" aria-pressed={lang === "bn"} onClick={() => changeLang("bn")}>বাংলা</button>
        </div>
      </div>

      <div className="msgs" ref={box} role="log" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`bub ${m.who}${m.err ? " err" : ""}`}>
            {m.text}
            {m.booking && <CalButtons booking={m.booking} />}
          </div>
        ))}
      </div>

      <div className="quick">
        {T[lang].quick.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => send(q)}>{q}</button>
        ))}
      </div>

      <form className="cin" style={{ margin: 0 }} onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input ref={inputEl} value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          maxLength={300} autoComplete="off" placeholder={T[lang].ph} aria-label="Your message" />
        {SpeechRec && (
          <button className="icon" type="button" title="Speak" aria-label="Speak your message" aria-pressed={listening} onClick={listen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        <button className="icon" type="button" title="Read replies aloud" aria-label="Read replies aloud" aria-pressed={speakOn} onClick={toggleSpeak}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9zM17 9a4 4 0 0 1 0 6" /></svg>
        </button>
        <button className="btn dark" type="submit">Send</button>
      </form>
    </div>
  );
}
