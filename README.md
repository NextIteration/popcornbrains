# The Unplugged 🧠⚡

> A smart distraction recovery and focus intervention app designed to conquer "popcorn brain" and maintain deep work flow.

---

## 🚀 Quick Links
- **Live Interactive UI Demo (Vercel):** [https://popcornbrains.vercel.app](https://popcornbrains.vercel.app)
- **GitHub Repository:** [https://github.com/NextIteration/popcornbrains](https://github.com/NextIteration/popcornbrains)

---

## 🌟 Overview & Key Features

**The Unplugged** addresses digital distraction by detecting attention drift, enforcing real-time interventions, and guiding users back into deep focus.

### Core Features (Member 4 - Intervention & UI)
- **Focus Dashboard:** Real-time focus timers, active goal/intent displays, and tracking controls.
- **Dynamic Interventions:** Smooth cooldown overlays, breathing exercises, reflection prompts, and break suggestions when attention drift occurs.
- **Productivity & Recovery Metrics:** Focus score tracking, distraction breakdown charts, and session stats.
- **Flexible Controls:** Ability to start, pause, resume, change focus goals, or end focus sessions seamlessly.

---

## 🛠️ Tech Stack & Architecture

- **Desktop Application:** Electron + Node.js + SQLite (`better-sqlite3`)
- **Web Dashboard:** React 19 + TypeScript + Vite + Vanilla CSS
- **Browser Extension:** Chrome Manifest V3
- **Focus & Recovery Engines:** Real-time drift detection, intervention overlays, and dynamic focus scoring.

---

## 💻 Running Locally (Full Desktop & Web Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/NextIteration/popcornbrains.git
cd popcornbrains
npm install
```

### 2. Run Web Dashboard (Development Server)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the dashboard UI.

### 3. Run Unit Tests
```bash
powershell -ExecutionPolicy Bypass -Command "npm test"
```

### 4. Start Backend Server
```bash
powershell -ExecutionPolicy Bypass -Command "npm run start:backend"
```

---

## 📄 License
ISC License
