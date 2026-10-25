import { gcal } from "../lib.js";
import { downloadPdf } from "../pdf.js";

export default function CalButtons({ booking }) {
  return (
    <div className="acts">
      <a className="btn small" target="_blank" rel="noopener noreferrer" href={gcal(booking)}>Google Calendar</a>
      <button type="button" className="btn small" onClick={() => downloadPdf(booking)}>Download PDF</button>
    </div>
  );
}
