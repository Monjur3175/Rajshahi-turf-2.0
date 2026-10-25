import { CONFIG, fmt, price } from "./lib.js";

// jsPDF is loaded only when someone clicks the button, so it doesn't slow the first page load.
export async function downloadPdf(b) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const amount = b.price_bdt ?? b.price ?? price(b.turf, b.date, b.hour);
  const day = new Date(b.date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // header band
  doc.setFillColor(20, 70, 40);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(20);
  doc.text(CONFIG.name, W / 2, 15, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text("Booking Confirmation", W / 2, 24, { align: "center" });

  // booking number
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text(`Booking #${b.booking_id}`, W / 2, 46, { align: "center" });

  // details
  // NOTE: the default PDF fonts have no Taka sign, so we write "BDT" instead of the symbol.
  const rows = [
    ["Name", b.name],
    ["Phone", b.phone],
    ["Pitch", b.turf],
    ["Date", day],
    ["Time", `${fmt(b.hour)} - ${fmt(b.hour + 1)} (1 hour)`],
    ["Amount", `BDT ${Number(amount).toLocaleString("en-US")} (pay at the turf)`],
  ].filter(([, v]) => v);

  let y = 62;
  doc.setFontSize(11);
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold").setTextColor(90, 90, 90).text(k, 18, y);
    doc.setFont("helvetica", "normal").setTextColor(20, 20, 20).text(String(v), 48, y, { maxWidth: W - 58 });
    doc.setDrawColor(220).line(18, y + 3, W - 18, y + 3);
    y += 11;
  });

  // footer
  doc.setFontSize(9).setTextColor(110, 110, 110);
  doc.text("Please arrive 10 minutes early and show this confirmation.", W / 2, y + 8, { align: "center" });
  doc.text(`${CONFIG.address}  |  ${CONFIG.phone}`, W / 2, y + 14, { align: "center" });
  doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, W / 2, y + 20, { align: "center" });

  doc.save(`turf-booking-${b.booking_id}.pdf`);
}
