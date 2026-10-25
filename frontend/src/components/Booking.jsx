import { useEffect, useRef, useState } from "react";
import CalButtons from "./CalButtons.jsx";
import { BASE, OPEN, CLOSE, iso, fmt, taka, price, api } from "../lib.js";

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function Pitch({ turf }) {
  const L = turf === "7-a-side";
  const r = L ? 13 : 10, y = L ? 18 : 24, h = L ? 40 : 28, w = L ? 20 : 14;
  return (
    <svg viewBox="0 0 120 76" width="92" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="2" y="2" width="116" height="72" rx="2" />
      <line x1="60" y1="2" x2="60" y2="74" />
      <circle cx="60" cy="38" r={r} />
      <rect x="2" y={y} width={w} height={h} />
      <rect x={118 - w} y={y} width={w} height={h} />
    </svg>
  );
}

export default function Booking({ chatBooking }) {
  const [turf, setTurf] = useState("5-a-side");
  const [date, setDate] = useState(iso(new Date()));
  const [hour, setHour] = useState(null);
  const [month, setMonth] = useState(monthStart(new Date()));
  const [booked, setBooked] = useState({});
  const [total, setTotal] = useState(CLOSE - OPEN);
  const [free, setFree] = useState(null);
  const [tick, setTick] = useState(0);        // bump to reload data after a booking
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const doneRef = useRef(null);

  const monthKey = iso(month).slice(0, 7);

  // booked-slot counts for the visible month
  useEffect(() => {
    let off = false;
    api(`/api/month?month=${monthKey}&turf=${encodeURIComponent(turf)}`)
      .then((r) => { if (!off) { setBooked(r.booked); setTotal(r.total); } })
      .catch((e) => { if (!off) setMsg(e.message); });
    return () => { off = true; };
  }, [monthKey, turf, tick]);

  // free slots for the selected day
  useEffect(() => {
    let off = false;
    api(`/api/slots?date=${date}&turf=${encodeURIComponent(turf)}`)
      .then((r) => { if (!off) setFree(new Set(r.free_slots.map((x) => x.hour))); })
      .catch((e) => { if (!off) { setFree(new Set()); setMsg(e.message); } });
    return () => { off = true; };
  }, [date, turf, tick]);

  // a booking made in the chat: jump to that day and reload
  useEffect(() => {
    if (!chatBooking) return;
    setDate(chatBooking.date);
    setMonth(monthStart(new Date(chatBooking.date + "T12:00:00")));
    setHour(null);
    setTick((t) => t + 1);
  }, [chatBooking]);

  useEffect(() => {
    if (done && doneRef.current) doneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [done]);

  const y = month.getFullYear(), m = month.getMonth();
  const today = iso(new Date());
  const now = new Date();
  const prevDisabled = month <= new Date(now.getFullYear(), now.getMonth(), 1);
  const nextDisabled = month >= new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const lead = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const ready = hour !== null;

  const pickTurf = (t) => { setTurf(t); setHour(null); setMsg(""); };
  const pickDate = (k) => { setDate(k); setHour(null); setMsg(""); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("Booking…");
    const n = name.trim(), p = phone.trim();
    try {
      const r = await api("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, phone: p, date, hour, turf }),
      });
      setDone({ booking: { name: n, phone: p, date, hour, turf, booking_id: r.booking_id, price_bdt: r.price_bdt }, price: r.price_bdt });
      setHour(null);
      setMsg("");
    } catch (err) {
      setMsg(err.message);
    }
    setTick((t) => t + 1);
    setBusy(false);
  }

  const b = done && done.booking;

  return (
    <section className="band" id="book">
      <div className="wrap">
        <h2>Book on the calendar</h2>

        <div className="lbl">Pitch size</div>
        <div className="turfs">
          {Object.keys(BASE).map((t) => (
            <button key={t} type="button" className="pitchbtn" aria-pressed={turf === t} onClick={() => pickTurf(t)}>
              <Pitch turf={t} />
              <span><b>{t}</b><small>from {taka(BASE[t])}/hr</small></span>
            </button>
          ))}
        </div>

        <div className="book">
          <div>
            <div className="lbl">Pick a day</div>
            <div className="calhead">
              <button className="chip" type="button" aria-label="Previous month" disabled={prevDisabled}
                onClick={() => setMonth(new Date(y, m - 1, 1))}>‹</button>
              <h3>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
              <button className="chip" type="button" aria-label="Next month" disabled={nextDisabled}
                onClick={() => setMonth(new Date(y, m + 1, 1))}>›</button>
            </div>
            <div className="cal">
              {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
              {Array.from({ length: lead }, (_, i) => <div key={"e" + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const k = iso(new Date(y, m, d));
                const c = booked[k] || 0;
                return (
                  <button key={k} type="button"
                    className={"day " + (c >= total ? "full" : c > 0 ? "busy" : "free")}
                    style={{ "--f": Math.min(1, c / total) }}
                    disabled={k < today || c >= total}
                    aria-pressed={date === k}
                    aria-label={`${k}, ${c} of ${total} slots booked`}
                    onClick={() => pickDate(k)}>{d}</button>
                );
              })}
            </div>
            <p className="key">The red bar under each date shows how much of that day is booked.</p>
          </div>

          <div>
            <div className="lbl" style={{ marginTop: 30 }}>Pick a start time (1 hour)</div>
            <div className="slots">
              {Array.from({ length: CLOSE - OPEN }, (_, i) => OPEN + i).map((h) => (
                <button key={h} type="button" className={`chip slot${h >= 17 ? " eve" : ""}`}
                  aria-pressed={hour === h} disabled={!free || !free.has(h)}
                  onClick={() => { setHour(h); setMsg(""); }}>
                  {fmt(h)}<small>{taka(price(turf, date, h))}</small>
                </button>
              ))}
            </div>
            <p className="key">Dark slots are floodlit hours, after 5pm.</p>

            <div className="ticket" aria-live="polite">
              <div>
                <h3>{ready ? `${turf}, ${fmt(hour)}–${fmt(hour + 1)}` : "Pick a time"}</h3>
                <div className="price">{ready ? taka(price(turf, date, hour)) : "—"}</div>
                <p>Evenings after 5pm and Fri/Sat cost a bit more.</p>
              </div>
              <form onSubmit={submit}>
                <label>Your name
                  <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Rafi Ahmed" />
                </label>
                <label>Phone number
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />
                </label>
                <button className="btn dark" type="submit" disabled={!ready || busy}>Book this slot</button>
                <div className="msg" role="alert">{msg}</div>
              </form>
            </div>
          </div>
        </div>

        <div className={`done${done ? " show" : ""}`} ref={doneRef}>
          {b && (
            <>
              <h3>You’re booked, {b.name}!</h3>
              <p>
                Booking #{b.booking_id}: {b.turf},{" "}
                {new Date(b.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })},{" "}
                {fmt(b.hour)}–{fmt(b.hour + 1)}, {taka(done.price)}. Pay at the turf.
              </p>
              <CalButtons booking={b} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
