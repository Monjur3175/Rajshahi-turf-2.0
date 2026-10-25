/* ===== Edit these ===== */
export const CONFIG = {
  name: "Rajshahi Turf 2.0",
  phone: "+880 1305-624121",
  manager: "Rohan",
  address: "Rajshahi, Bangladesh",
  // Leave empty when server.py serves the site. Otherwise set VITE_API_URL at build time.
  api: import.meta.env.VITE_API_URL || "",
};
/* ====================== */

// Keep these in sync with agent.py (TURFS, OPEN_HOUR, CLOSE_HOUR, price_for)
export const BASE = { "5-a-side": 1500, "7-a-side": 2500 };
export const OPEN = 6;
export const CLOSE = 24;

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fmt = (h) => (h === 24 ? "12am" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`);
export const taka = (n) => "৳" + Number(n).toLocaleString("en-US");

export function price(turf, date, hour) {
  let p = BASE[turf];
  if (hour >= 17) p *= 1.4;
  const w = new Date(date + "T12:00:00").getDay();
  if (w === 5 || w === 6) p *= 1.2;
  return Math.floor(p + 1e-6);
}

export async function api(path, opts) {
  let r;
  try {
    r = await fetch(CONFIG.api + path, opts);
  } catch {
    throw new Error("Can’t reach the booking server. Please try again soon.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : "Something went wrong. Please try again.");
  return j;
}

/* ---------- calendar links ---------- */
const stamp = (d, h) => d.replace(/-/g, "") + "T" + String(h).padStart(2, "0") + "0000";
function endStamp(d, h) {
  if (h < 23) return stamp(d, h + 1);
  const n = new Date(d + "T12:00:00");
  n.setDate(n.getDate() + 1);
  return iso(n).replace(/-/g, "") + "T000000";
}
export const gcal = (b) =>
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
  encodeURIComponent(`Football at ${CONFIG.name} (${b.turf})`) +
  `&dates=${stamp(b.date, b.hour)}/${endStamp(b.date, b.hour)}&ctz=Asia/Dhaka&location=` +
  encodeURIComponent(CONFIG.address) +
  "&details=" +
  encodeURIComponent("Booking #" + b.booking_id);
