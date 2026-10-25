"""Football turf booking voice agent (Groq free API, Windows voice).
Text mode:  python agent.py
Voice mode: python agent.py --voice [--lang bn]
"""
import os, re, sys, json, sqlite3, argparse, datetime as dt
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
# Provider: OpenRouter if OPENROUTER_API_KEY is set, otherwise Groq
if os.getenv("OPENROUTER_API_KEY"):
    PROVIDER = "openrouter"
    client = OpenAI(api_key=os.getenv("OPENROUTER_API_KEY"), base_url="https://openrouter.ai/api/v1")
elif os.getenv("GROQ_API_KEY"):
    PROVIDER = "groq"
    client = OpenAI(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1")
else:
    sys.exit("No API key found. Create a .env file next to agent.py with OPENROUTER_API_KEY=... (or GROQ_API_KEY=...)")

def pick_model():
    """Use MODEL from .env if set, otherwise pick a working chat model from your account."""
    if os.getenv("MODEL"):
        return os.getenv("MODEL")
    models = client.models.list().data
    if PROVIDER == "openrouter":
        free = []
        for m in models:
            extra = getattr(m, "model_extra", None) or {}
            if m.id.endswith(":free") and "tools" in (extra.get("supported_parameters") or []):
                free.append(m.id)
        for pref in ("gpt-oss", "llama", "qwen", "gemini", "mistral"):
            for i in free:
                if pref in i.lower():
                    return i
        return free[0] if free else "openai/gpt-oss-20b:free"
    ids = [m.id for m in models]
    bad = ("whisper", "tts", "guard", "compound", "orpheus", "embed", "safeguard")
    chat = [i for i in ids if not any(b in i.lower() for b in bad)]
    for pref in ("gpt-oss-120b", "llama-3.3", "qwen", "llama", "gpt-oss"):
        for i in chat:
            if pref in i.lower():
                return i
    if chat:
        return chat[0]
    sys.exit("No chat models found. Set MODEL in .env.")

TURF_NAME = "Rajshahi Turf 2.0"
TURFS = {"5-a-side": 1500, "7-a-side": 2500}   # base price per hour (BDT)
OPEN_HOUR, CLOSE_HOUR = 6, 24                   # 6am to midnight, 1-hour slots

# ---------- database ----------
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bookings.db")
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT,
  turf TEXT, date TEXT, hour INTEGER, price INTEGER,
  UNIQUE(turf, date, hour))""")
db.commit()

def price_for(turf, date, hour):
    p = TURFS[turf]
    if hour >= 17: p *= 1.4                                        # evening peak
    if dt.date.fromisoformat(date).weekday() in (4, 5): p *= 1.2   # Fri/Sat
    return int(p)

def fmt(h):
    return "12am" if h == 24 else f"{h % 12 or 12}{'am' if h < 12 else 'pm'}"

def in_past(date, hour):
    now = dt.datetime.now()
    when = dt.datetime.combine(dt.date.fromisoformat(date), dt.time(0)) + dt.timedelta(hours=hour)
    return when <= now

# ---------- tools ----------
def get_available_slots(date, turf):
    if turf not in TURFS: return {"error": f"turf must be one of {list(TURFS)}"}
    taken = {r[0] for r in db.execute("SELECT hour FROM bookings WHERE date=? AND turf=?", (date, turf))}
    free = [h for h in range(OPEN_HOUR, CLOSE_HOUR) if h not in taken]
    if date == dt.date.today().isoformat():
        free = [h for h in free if h > dt.datetime.now().hour]
    return {"date": date, "turf": turf,
            "free_slots": [{"hour": h, "label": fmt(h), "price_bdt": price_for(turf, date, h)} for h in free]}

def create_booking(name, phone, date, hour, turf):
    if turf not in TURFS: return {"error": "unknown turf"}
    hour = int(hour)
    if not OPEN_HOUR <= hour < CLOSE_HOUR: return {"error": "outside opening hours"}
    if in_past(date, hour): return {"error": "that time has already passed"}
    try:
        p = price_for(turf, date, hour)
        cur = db.execute("INSERT INTO bookings(name,phone,turf,date,hour,price) VALUES(?,?,?,?,?,?)",
                         (name, phone, turf, date, hour, p))
        db.commit()
        return {"ok": True, "booking_id": cur.lastrowid, "price_bdt": p}
    except sqlite3.IntegrityError:
        return {"ok": False, "error": "slot already taken"}

def cancel_booking(booking_id):
    cur = db.execute("DELETE FROM bookings WHERE id=?", (booking_id,)); db.commit()
    return {"ok": cur.rowcount > 0}

FUNCS = {"get_available_slots": get_available_slots, "create_booking": create_booking, "cancel_booking": cancel_booking}

TOOLS = [
 {"type": "function", "function": {"name": "get_available_slots",
  "description": "List free 1-hour slots and prices for a date and turf.",
  "parameters": {"type": "object", "properties": {
      "date": {"type": "string", "description": "YYYY-MM-DD"},
      "turf": {"type": "string", "enum": list(TURFS)}}, "required": ["date", "turf"]}}},
 {"type": "function", "function": {"name": "create_booking",
  "description": "Book a 1-hour slot. Only call after the customer confirms.",
  "parameters": {"type": "object", "properties": {
      "name": {"type": "string"}, "phone": {"type": "string"},
      "date": {"type": "string", "description": "YYYY-MM-DD"},
      "hour": {"type": "integer", "description": "start hour 0-23, e.g. 19 for 7pm"},
      "turf": {"type": "string", "enum": list(TURFS)}}, "required": ["name", "phone", "date", "hour", "turf"]}}},
 {"type": "function", "function": {"name": "cancel_booking",
  "description": "Cancel a booking by id.",
  "parameters": {"type": "object", "properties": {"booking_id": {"type": "integer"}}, "required": ["booking_id"]}}},
]

def system_prompt(lang):
    today = dt.date.today()
    reply_lang = "Bangla" if lang == "bn" else "English"
    return f"""You are the phone booking assistant for {TURF_NAME}, a football turf in Rajshahi.
Today is {today.strftime('%A, %Y-%m-%d')}. Open daily 6am-midnight. Turfs: 5-a-side and 7-a-side. Slots are 1 hour.
Prices: 5-a-side 1500 BDT/hr, 7-a-side 2500 BDT/hr; evenings after 5pm cost 40% more, Fri/Sat 20% more (the tool gives exact prices).
Cancellation is free up to 6 hours before the slot.
Rules: reply in {reply_lang}. Replies are SPOKEN, so keep them to 1-2 short sentences, no lists or markdown.
Ask for one missing detail at a time (turf size, date, time, name, phone).
Never guess availability, always use the tools. If a slot is taken, offer the two nearest free slots.
Before create_booking, read back turf, date, time and price and wait for a clear yes."""

# ---------- agent loop ----------
def chat_turn(messages, lang):
    for _ in range(6):  # safety limit on tool loops
        r = client.chat.completions.create(
            model=MODEL, max_tokens=800, tools=TOOLS,
            messages=[{"role": "system", "content": system_prompt(lang)}] + messages)
        msg = r.choices[0].message
        entry = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            entry["tool_calls"] = [{"id": tc.id, "type": "function",
                                    "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                                   for tc in msg.tool_calls]
        messages.append(entry)
        if not msg.tool_calls:
            return re.sub(r"<think>.*?</think>", "", msg.content or "", flags=re.S).strip()
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
                out = FUNCS[tc.function.name](**args)
            except Exception as e:
                args, out = {}, {"error": str(e)}
            print(f"  [tool] {tc.function.name}({args}) -> {str(out)[:120]}")
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": json.dumps(out)})
    return "Sorry, something went wrong. Could you repeat that?"

# ---------- voice (Windows) ----------
def listen(lang, max_seconds=15):
    import sounddevice as sd, speech_recognition as sr
    from array import array
    RATE, CHUNK = 16000, 1600            # 0.1 s chunks
    THRESH, SILENCE_CHUNKS = 500, 12     # raise THRESH in noisy rooms; lower if it never starts
    print("Listening...")
    frames, started, quiet = [], False, 0
    with sd.RawInputStream(samplerate=RATE, channels=1, dtype="int16", blocksize=CHUNK) as stream:
        for _ in range(max_seconds * 10):
            data, _ = stream.read(CHUNK)
            data = bytes(data)
            samples = array("h", data)
            level = (sum(s * s for s in samples) / len(samples)) ** 0.5
            if level > THRESH:
                started, quiet = True, 0
            elif started:
                quiet += 1
            if started:
                frames.append(data)
                if quiet >= SILENCE_CHUNKS:
                    break
    if not frames:
        return ""
    audio = sr.AudioData(b"".join(frames), RATE, 2)
    try:
        return sr.Recognizer().recognize_google(audio, language="bn-BD" if lang == "bn" else "en-US")
    except Exception:
        return ""

def speak(text, lang):
    import tempfile, ctypes
    from gtts import gTTS
    path = os.path.join(tempfile.gettempdir(), "turf_reply.mp3")
    gTTS(text=text, lang="bn" if lang == "bn" else "en").save(path)
    mci = ctypes.windll.winmm.mciSendStringW   # Windows built-in audio player
    mci("close turf", None, 0, 0)
    mci(f'open "{path}" type mpegvideo alias turf', None, 0, 0)
    mci("play turf wait", None, 0, 0)
    mci("close turf", None, 0, 0)

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", action="store_true")
    ap.add_argument("--lang", default="en", choices=["en", "bn"])
    a = ap.parse_args()
    global MODEL
    MODEL = pick_model()
    print(f"(using model: {MODEL})")
    messages = []
    greeting = "আসসালামু আলাইকুম, রাজশাহী টার্ফ ২.০-তে স্বাগতম। কীভাবে সাহায্য করতে পারি?" if a.lang == "bn" \
        else f"Hi, welcome to {TURF_NAME}. How can I help you?"
    print("Agent:", greeting)
    if a.voice: speak(greeting, a.lang)
    while True:
        user = listen(a.lang) if a.voice else input("You: ")
        if a.voice: print("You:", user)
        if user.strip().lower().strip(".!? ") in ("quit", "exit", "bye", "goodbye"): break
        if not user.strip(): continue
        messages.append({"role": "user", "content": user})
        try:
            reply = chat_turn(messages, a.lang)
        except Exception as e:
            print(f"  [error] {e}")
            messages.pop()   # drop the failed message so you can retry
            continue
        print("Agent:", reply)
        if a.voice: speak(reply, a.lang)

if __name__ == "__main__":
    main()
