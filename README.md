# Rajshahi Turf 2.0

An AI-powered booking system for a football turf in Rajshahi, Bangladesh. Customers can book a pitch in two ways: by chatting (or speaking) with an assistant in English or Bangla, or by picking a day and time on a live calendar. Both paths use the same database, so a booking made in chat shows up on the calendar immediately.

## Features

### Booking assistant (chat and voice)
- Understands natural requests such as "5-a-side tomorrow at 7pm" and asks for one missing detail at a time (pitch size, date, time, name, phone).
- Replies in **English or Bangla**, switchable in the chat window.
- Never guesses availability. It always calls the booking tools, and if a slot is taken it offers the two nearest free slots.
- Reads back pitch, date, time and price, and only books after a clear "yes".
- Replies are short, plain sentences with no lists or markdown, because they are meant to be spoken.
- **Browser voice:** a microphone button for speech input and a speaker button to read replies aloud (uses the browser's built-in speech APIs, so support depends on the browser).
- **Terminal voice (Windows):** `python agent.py --voice` listens through the microphone, stops when you pause, transcribes with Google speech recognition and speaks replies with gTTS.
- Quick-reply chips in both languages, and a friendly error message if the AI provider is busy.

### Booking calendar
- Choose **5-a-side** or **7-a-side** (shown as pitch diagrams with the starting price).
- Month calendar for the current and next month. A bar under each date shows how booked the day is, and full or past days are disabled.
- Hourly slot grid from 6am to midnight. Evening slots (after 5pm) are styled as "floodlit" so higher prices are easy to spot.
- Live price summary, then a short form (name and phone) to confirm.
- After booking: confirmation message, **Google Calendar** link and a downloadable **PDF booking confirmation**. These also appear under bookings made through chat.

### Rules and pricing
| When | 5-a-side | 7-a-side |
|---|---|---|
| Sun–Thu, before 5pm | ৳1,500 | ৳2,500 |
| Sun–Thu, after 5pm | ৳2,100 | ৳3,500 |
| Fri and Sat, before 5pm | ৳1,800 | ৳3,000 |
| Fri and Sat, after 5pm | ৳2,520 | ৳4,200 |

- Open daily, 6am to midnight, in 1-hour slots.
- Evening peak (hour 17 and later) is +40%. Friday and Saturday are +20%. The two stack.
- Slots that have already passed cannot be booked, and today's list only shows future hours.
- Double bookings are impossible: the database has a unique constraint on pitch, date and hour.

### Website
Single-page site with a hero and chat, how-it-works steps, the booking calendar, price table, contact details with an embedded map, and an FAQ. It is responsive and respects reduced-motion settings.

## How it works

```
Browser (index.html)
   │  chat, calendar, booking form
   ▼
FastAPI server (server.py)  ──►  agent.py
   │                              ├─ LLM via OpenRouter or Groq (OpenAI-compatible API)
   │                              ├─ Tools: get_available_slots, create_booking, cancel_booking
   ▼                              └─ SQLite database (bookings.db)
JSON API
```

The agent runs a tool loop (up to 6 steps per message): the model decides which tool to call, the tool reads or writes SQLite, and the result goes back to the model, which then writes the reply. `server.py` keeps one conversation per browser session and detects when a booking was saved so the page can refresh and show calendar buttons.

### Agent tools
| Tool | What it does |
|---|---|
| `get_available_slots(date, turf)` | Lists free 1-hour slots with exact prices for a date and pitch. |
| `create_booking(name, phone, date, hour, turf)` | Saves a booking after the customer confirms. Rejects taken, past or out-of-hours slots. |
| `cancel_booking(booking_id)` | Deletes a booking by its number. |

## API

| Method and path | Purpose |
|---|---|
| `POST /api/chat` | Body: `{session_id, message, lang}`. Returns `{reply, booking}`; `booking` is set if a booking was saved this turn. |
| `GET /api/slots?date=YYYY-MM-DD&turf=5-a-side` | Free slots and prices for a day. |
| `GET /api/month?month=YYYY-MM&turf=5-a-side` | Number of booked slots per date, plus total slots per day. |
| `POST /api/book` | Body: `{name, phone, date, hour, turf}`. Direct booking from the calendar form. Returns `409` if the slot is taken. |
| `GET /` | Serves `index.html`. |

Built-in safeguards: messages are capped at 300 characters, dates and phone numbers are validated, sessions are limited in size and number, and requests are processed one at a time with a lock to keep SQLite safe.

## Project structure

```
.
├── agent.py                 # Prompt, tools, pricing, SQLite, agent loop, terminal text/voice mode
├── server.py                # FastAPI app: chat, slots, month, book, serves frontend/dist
├── requirements.txt         # Server dependencies
├── requirements-voice.txt   # Extra packages for local terminal voice mode only
├── .env                     # Your API keys (never commit this)
└── frontend/                # React website (Vite)
    ├── index.html
    ├── package.json, vite.config.js
    └── src/
        ├── main.jsx, App.jsx, styles.css
        ├── lib.js           # CONFIG, prices, API helper, calendar links
        └── components/      # Navbar, Hero, Chat, Booking, CalButtons, ScrollTop, Static
```

## Getting started

**Requirements:** Python 3.10 or newer, and a free API key from [OpenRouter](https://openrouter.ai) or [Groq](https://console.groq.com).

```bash
git clone <your-repo-url>
cd <your-repo>
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file next to `agent.py`:

```env
OPENROUTER_API_KEY=your_key_here
# or: GROQ_API_KEY=your_key_here
# MODEL=optional-model-name
# PORT=8000
```

If both keys are set, OpenRouter is used. If `MODEL` is not set, the app picks a working chat model that supports tool calling from your account.

**Build the website, then run the server:**

```bash
cd frontend
npm install
npm run build
cd ..
python server.py
```

Open http://localhost:8000.

**Develop the website with hot reload** (run both at the same time):

```bash
python server.py            # terminal 1: API on port 8000
cd frontend && npm run dev  # terminal 2: site on http://localhost:5173, /api is proxied to port 8000
```

**Run in the terminal:**

```bash
python agent.py                    # text chat
python agent.py --lang bn          # Bangla
pip install -r requirements-voice.txt
python agent.py --voice            # spoken chat (Windows)
```

## Configuration

| What | Where |
|---|---|
| Business name, pitch sizes, base prices, opening hours | `TURF_NAME`, `TURFS`, `OPEN_HOUR`, `CLOSE_HOUR` in `agent.py` |
| Peak and weekend surcharges | `price_for()` in `agent.py` |
| Phone, manager, address, API URL | `CONFIG` in `frontend/src/lib.js` |
| Assistant behaviour and tone | `system_prompt()` in `agent.py` |

Prices are also defined in `frontend/src/lib.js` (`BASE` and `price()`) and in the table in `frontend/src/components/Static.jsx` so the page can show them instantly. If you change prices, update both files.

## Deployment

- `server.py` serves both the site and the API, so a single web service is enough. Render, Railway, Fly.io or a VPS all work with the start command `python server.py`.
- Run `npm run build` in `frontend` during the build step (build command: `cd frontend && npm install && npm run build && cd .. && pip install -r requirements.txt`).
- Set the API key as an environment variable on the host instead of uploading `.env`.
- Set `TZ=Asia/Dhaka` so "today" and "already passed" use Bangladesh time rather than UTC.
- SQLite needs a **persistent disk**. Serverless platforms such as Vercel wipe local files, so do not run the backend there. You can host the `frontend` folder on Vercel (framework: Vite) and set the `VITE_API_URL` environment variable to your backend URL.
- Add `.env` and `bookings.db` to `.gitignore`.

## Known limitations

- **No payment.** Customers pay at the turf.
- **Cancellation is not protected.** Anyone with a booking number can cancel it, and the "free up to 6 hours before" rule is stated by the assistant but not enforced in code.
- **Chat history is kept in memory**, so it resets when the server restarts.
- **One server instance only**, because of SQLite and the in-process lock.
- **Voice quality depends on the browser or device**, and Bangla speech recognition is less reliable than English.

## Ideas for next steps

- Admin dashboard for the manager to view and manage bookings
- SMS or WhatsApp confirmations and reminders
- Online payment with bKash or Nagad
- Phone-number check for cancellations and enforcement of the 6-hour rule
- Move to Postgres for multi-instance hosting
- Multi-hour bookings and recurring weekly slots

## Tech stack

Python, FastAPI, Uvicorn, SQLite, OpenAI-compatible SDK (OpenRouter or Groq), and React 18, Vite, plain CSS and the Web Speech API.
