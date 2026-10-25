import { useEffect, useRef, useState } from "react";

const LINKS = [
  ["#how", "How it works"],
  ["#book", "Calendar"],
  ["#prices", "Prices"],
  ["#find", "Find us"],
  ["#faq", "FAQ"],
];
const BARS = "M4 7h16M4 12h16M4 17h16";
const CROSS = "M6 6l12 12M18 6L6 18";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      let cur = "";
      for (const [href] of LINKS) {
        const el = document.getElementById(href.slice(1));
        if (el && el.getBoundingClientRect().top <= 140) cur = href;
      }
      setActive(cur);
    };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onResize = () => { if (window.innerWidth > 860) setOpen(false); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <nav ref={ref} className={`${scrolled ? "scrolled" : ""} ${open ? "open" : ""}`.trim()}>
      <div className="wrap">
        <a className="logo" href="#top">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#ffd36b" strokeWidth="2.5" aria-hidden="true">
            <rect x="2" y="4" width="26" height="22" rx="2" /><line x1="15" y1="4" x2="15" y2="26" /><circle cx="15" cy="15" r="5" />
          </svg>
          Rajshahi Turf 2.0
        </a>
        <button className="menu" type="button" aria-label="Menu" aria-expanded={open} aria-controls="links" onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d={open ? CROSS : BARS} />
          </svg>
        </button>
        <div className="links" id="links">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} aria-current={active === href ? "true" : undefined} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </div>
      </div>
    </nav>
  );
}