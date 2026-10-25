import { CONFIG } from "../lib.js";

const tel = "tel:" + CONFIG.phone.replace(/[^+\d]/g, "");

export function Steps() {
  return (
    <section id="how">
      <div className="wrap">
        <h2>From message to kick-off</h2>
        <div className="steps">
          <div className="step"><b>1</b><h3>Say what you need</h3><p>“5-a-side tomorrow at 7pm.” Type or speak, in English or Bangla.</p></div>
          <div className="step"><b>2</b><h3>Hear the price</h3><p>The assistant checks the live calendar and tells you the exact cost.</p></div>
          <div className="step"><b>3</b><h3>Say yes</h3><p>Confirm once and the slot is yours. Add it to your phone calendar.</p></div>
        </div>
      </div>
    </section>
  );
}

const ROWS = [
  ["Sun–Thu, before 5pm", "৳1,500", "৳2,500", false],
  ["Sun–Thu, after 5pm", "৳2,100", "৳3,500", true],
  ["Fri & Sat, before 5pm", "৳1,800", "৳3,000", false],
  ["Fri & Sat, after 5pm", "৳2,520", "৳4,200", true],
];

export function Prices() {
  return (
    <section id="prices">
      <div className="wrap">
        <h2>Prices per hour</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>When</th><th>5-a-side</th><th>7-a-side</th></tr></thead>
            <tbody>
              {ROWS.map(([when, a, b, eve]) => (
                <tr key={when} className={eve ? "eve" : undefined}><td>{when}</td><td>{a}</td><td>{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Open every day, 6am to midnight. Free cancellation up to 6 hours before your slot.</p>
      </div>
    </section>
  );
}

export function Find() {
  return (
    <section className="find" id="find">
      <div className="wrap">
        <h2>Find us</h2>
        <div className="findgrid">
          <div className="contact">
            <div><small>Manager</small><b>{CONFIG.manager}</b></div>
            <div><small>Call or WhatsApp</small><b><a href={tel}>{CONFIG.phone}</a></b></div>
            <div><small>Address</small><b>{CONFIG.address}</b></div>
            <div><small>Open</small><b>Every day, 6am to midnight</b></div>
            <a className="btn dark" href={tel}>Call {CONFIG.manager}</a>
          </div>
          <div className="mapbox">
            <iframe title="Map showing Rajshahi Turf" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29070.85819324958!2d88.59650267910159!3d24.386267999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39fbef004ca0a7bd%3A0x63619b962aa0001b!2sRajshahi%20Turf!5e0!3m2!1sen!2sbd!4v1792891690021!5m2!1sen!2sbd" />
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  ["How long is a booking?", "Every slot is one hour. Need longer? Book back-to-back slots."],
  ["Can I cancel?", "Yes. Tell the assistant your booking number up to 6 hours before your slot."],
  ["Do I have to chat with the bot?", "No. Pick a day and time on the calendar and fill in your name and phone."],
  ["Does it understand Bangla?", "Yes. Tap “বাংলা” in the chat window and talk or type in Bangla."],
];

export function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <h2>Quick answers</h2>
        <div className="faq">
          {FAQS.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <b>{CONFIG.name}</b>
        <span>{CONFIG.address}</span>
        <span>{CONFIG.manager}: <a href={tel}>{CONFIG.phone}</a></span>
      </div>
    </footer>
  );
}
