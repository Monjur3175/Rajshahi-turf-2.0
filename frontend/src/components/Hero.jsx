import { useEffect, useState } from "react";
import Chat from "./Chat.jsx";

const FULL = "Say when you want to play.";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Loop: floodlights flicker on, headline types, holds, erases, floodlights flicker off, repeat. */
function useFloodlitHeadline() {
  const [n, setN] = useState(0);
  const [lights, setLights] = useState("lit");
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // static text, lights stay on
    let dead = false;
    setAnimated(true);
    (async () => {
      while (!dead) {
        setLights("lit"); await wait(1300); if (dead) return;
        for (let i = 1; i <= FULL.length; i++) { setN(i); await wait(FULL[i - 1] === " " ? 140 : 70); if (dead) return; }
        await wait(2800); if (dead) return;
        for (let i = FULL.length - 1; i >= 0; i--) { setN(i); await wait(35); if (dead) return; }
        await wait(300); if (dead) return;
        setLights("unlit"); await wait(1900);
      }
    })();
    return () => { dead = true; };
  }, []);

  return { n, lights, animated };
}

export default function Hero({ onBooking }) {
  const { n, lights, animated } = useFloodlitHeadline();

  return (
    <header className="hero" id="top">
      <svg className={`beams ${lights}`} viewBox="0 0 1200 760" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd36b" stopOpacity=".38" />
            <stop offset="1" stopColor="#ffd36b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="70,10 150,10 760,760 -240,760" fill="url(#bm)" />
        <polygon points="1050,10 1130,10 1500,760 480,760" fill="url(#bm)" />
        <rect x="60" y="0" width="100" height="14" rx="3" fill="#ffd36b" />
        <rect x="1040" y="0" width="100" height="14" rx="3" fill="#ffd36b" />
      </svg>

      <div className="wrap hero-grid">
        <div>
          <h1 id="tw" className={animated ? "on" : ""} aria-label={FULL}>
            <span aria-hidden="true">
              <span>{FULL.slice(0, n)}</span>
              {animated && <i className="cur" />}
              <span id="twRest">{FULL.slice(n)}</span>
            </span>
          </h1>
          <p className="lead">Tell our booking assistant the day and time. It checks the live calendar and saves your pitch.</p>
          <a className="btn" href="#book">Open the calendar</a>
          <div className="facts"><span>Open 6am to midnight</span><span>Free cancellation until 6 hours before</span></div>
        </div>
        <Chat onBooking={onBooking} />
      </div>
    </header>
  );
}
