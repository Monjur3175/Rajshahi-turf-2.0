"""Web server: serves the built React website and the API (chat, calendar, bookings).
Build the site once:  cd frontend && npm install && npm run build
Run:  python server.py   then open http://localhost:8000
"""
import os, re, json, calendar, threading, datetime as dt
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import agent                      # reuses the same tools, prices and database

agent.MODEL = agent.pick_model()
print(f"(using model: {agent.MODEL})")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
LOCK = threading.Lock()           # one request at a time keeps SQLite simple and safe
SESSIONS = {}
ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "frontend", "dist")   # built React site (cd frontend && npm run build)

class ChatIn(BaseModel):
    session_id: str
    message: str
    lang: str = "en"

class BookIn(BaseModel):
    name: str
    phone: str
    date: str
    hour: int
    turf: str

def valid_date(d):
    try: dt.date.fromisoformat(d)
    except ValueError: raise HTTPException(400, "Invalid date")

def find_booking(new_msgs):
    """Return the booking if the agent saved one during this turn."""
    calls, booking = {}, None
    for m in new_msgs:
        for tc in m.get("tool_calls", []) if m.get("role") == "assistant" else []:
            if tc["function"]["name"] == "create_booking":
                try: calls[tc["id"]] = json.loads(tc["function"]["arguments"])
                except Exception: pass
        if m.get("role") == "tool" and m["tool_call_id"] in calls:
            res = json.loads(m["content"])
            if res.get("ok"):
                a = calls[m["tool_call_id"]]
                booking = {**a, "hour": int(a["hour"]), "booking_id": res["booking_id"], "price_bdt": res["price_bdt"]}
    return booking

@app.post("/api/chat")
def chat(b: ChatIn):
    msg = b.message.strip()[:300]
    if not msg: raise HTTPException(400, "Empty message")
    lang = "bn" if b.lang == "bn" else "en"
    with LOCK:
        if len(SESSIONS) > 500: SESSIONS.clear()
        msgs = SESSIONS.setdefault(b.session_id[:64], [])
        if len(msgs) > 80: msgs.clear()
        start = len(msgs)
        msgs.append({"role": "user", "content": msg})
        try:
            reply = agent.chat_turn(msgs, lang)
        except Exception as e:
            print("chat error:", e)
            del msgs[start:]
            raise HTTPException(502, "The assistant is busy. Please try again in a moment.")
        return {"reply": reply, "booking": find_booking(msgs[start:])}

@app.get("/api/slots")
def slots(date: str, turf: str):
    valid_date(date)
    with LOCK: return agent.get_available_slots(date, turf)

@app.get("/api/month")
def month(month: str, turf: str):
    if not re.fullmatch(r"\d{4}-\d{2}", month): raise HTTPException(400, "Invalid month")
    y, m = int(month[:4]), int(month[5:])
    last = calendar.monthrange(y, m)[1]
    with LOCK:
        rows = agent.db.execute("SELECT date, COUNT(*) FROM bookings WHERE turf=? AND date BETWEEN ? AND ? GROUP BY date",
                                (turf, f"{month}-01", f"{month}-{last:02d}")).fetchall()
    return {"total": agent.CLOSE_HOUR - agent.OPEN_HOUR, "booked": dict(rows)}

@app.post("/api/book")
def book(b: BookIn):
    valid_date(b.date)
    if not b.name.strip() or not re.fullmatch(r"[+\d][\d\s-]{6,}", b.phone.strip()):
        raise HTTPException(400, "Enter your name and a valid phone number")
    with LOCK:
        res = agent.create_booking(b.name.strip()[:60], b.phone.strip()[:20], b.date, b.hour, b.turf)
    if not res.get("ok"):
        raise HTTPException(409, res.get("error", "Could not book"))
    return res

if os.path.isdir(os.path.join(DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

@app.get("/")
def home():
    index = os.path.join(DIST, "index.html")
    if not os.path.exists(index):
        raise HTTPException(404, "Website not built yet. Run: cd frontend && npm install && npm run build")
    return FileResponse(index)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
