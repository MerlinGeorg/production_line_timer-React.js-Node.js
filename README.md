# Production Line Timer Tracking System

A full-stack web application that lets production line workers track the duration of a build process, record defects, and manage extended work time after the scheduled build duration has passed.

## Setup

### Prerequisites
 Node.js ≥ 21

### 1 — Backend

```bash
cd backend
npm install
npm run seed     # Creates db/timer.db and inserts 6 builds
npm run dev      # Starts API on http://localhost:4000
```

### 2 — Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```
Open **http://localhost:5173**

For production builds: `npm run build` in frontend → serve `dist/` behind any static host; the backend stays as `npm start`.

---

## Tech Stack

Frontend - React, Build tool: Vite
    State - useReducer
    TimerDisplay - requestAnimationFrame
Backend - Node.js, Express
Database - SQLite



## Database Schema

4 tables: 

1) builds  - to seed build configs
2) sessions  - stores one row per session(active/completed) per loginId. 
3) pause_events - to store individual pause/resume pairs with timestamps and duration for each pause.
4) popup_events - store every "time exceeded" modal interaction to know when was it last shown and when was the last time user clicked Yes/no in the modal.


## Seeded Build Numbers

  { build_number: "BLD-001", num_parts: 10, time_per_part: 3 },
  { build_number: "BLD-002", num_parts: 25, time_per_part: 2 },
  { build_number: "BLD-003", num_parts: 5, time_per_part: 5 },
  { build_number: "BLD-004", num_parts: 15, time_per_part: 4 },
  { build_number: "BLD-005", num_parts: 20, time_per_part: 1 },
  { build_number: "123456", num_parts: 25, time_per_part: 2 },

## API Reference

Method  -        Path                        -  Description 

GET     -  `/api/builds/:buildNumber`        -  Fetch build config 
POST    -  `/api/sessions`                   -  Create session 
GET     -  `/api/sessions/active/:loginId`   -  Restore session on refresh 
PATCH   -  `/api/sessions/:id/pause`         -  Pause timer 
PATCH   -  `/api/sessions/:id/resume`        -  Resume, accumulate pause time 
PATCH   -  `/api/sessions/:id/defects`       -  Update defect count 
POST    -  `/api/sessions/:id/popup`         -  Log popup action 
POST    -  `/api/sessions/:id/submit`        -  Finalise session 
GET    -   `/api/`                           -  Backend health check 

## Key Design Decisions & Assumptions

- 2 UI state layers: one local state for timer page(pause, defects, modal visibility) and one global session state(shared across all pages).
- loginId is a plain string with no authentication as per the project requirements given, it is used only as a lookup key to find an active session.
- In addition to storing loginId in backend, it is also stored in as the browser-side persistence data, which is stored in `localStorage` - all other session data is only stored in the database. So on page load, the app reads loginId from `localStorage` and restore full session state for that loginId from the server. If the server returns no active session, the stale loginId is removed from `localStorage` and the user is redirected to  login page.
- Build data (such as numberOfParts, timePerPart) is seeded once at backend setup and treated as read-only; UI doesn't update the builds data.
- Login attempts from multiple users/ different browsers with same loginId & BuildNumber trying to fetch build data see the same session data as no authentication is handled using loginId and only one active session is allowed per loginId at any time.  
- Total inactive time is computed by counting only the explicitly paused durations, not the user's not interacted time with the app.
- Timer is computed from server stored timestamps by calcuting this on every tick: timeLeft = allocatedTime − (now − startTime − totalPausedTime − currentPauseTime) , to make it drift-free and to show the correct timer value after page refresh.
- When the allocated time reaches 00:00:00, the overtime counter starts counting in the background, and the time exceeded popup appears on top of it asking confirmation to continue or not, and after clicking yes, the overtime counter correctly shows the elapsed overtime value(as it was already running in the background before even clicking yes) and continue counting the overtime.
- The time exceeded popup is shown for 10 minutes. if neither Yes or No is clicked in 10 min, session is autosubmitted and user directed to login page.
- if user clicks Yes, the next popup is scheduled 10 minutes from the moment Yes is clicked. 
- Defect count increasing and decreasing is not just being changed on the UI side or not only saved at final submission, instead it gets updated instantly in the backend to ensure closing browser doesn't lose the UI updates.
And If two browsers update defects without refreshing browser, last-write wins.
- Total-Active-time and total-inactive-time for each session is stored in the backend but not displayed in UI as per project specifications given.

- Frontend Design:

Instead of using a seperate assets folder, Co-located css files with components because those CSS belongs to the particular components only, not to the app globally.

- Backend:

No seperate, model, controller, service, or repository layer is used because adding these layers at the project's current scale adds more boilerplate than benefit. It is needed only if the codebase grows.

Sqlite is used as persistent storage in the backend instead of a real db because it provides zero-configuration local setup - no separate database server is required and it works fine with a single process.

Used parameterized queries to protect against sql injection attacks.