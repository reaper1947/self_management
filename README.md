# 🕹️ [PLAYER 1: PETER] - Self Management Dashboard

Welcome to the **Self Management Dashboard**! This is a unified, fully responsive personal dashboard built with a cool 8-bit retro gaming aesthetic. It is designed to help Peter manage his daily habits, schedule tasks, and level up his physical fitness like an RPG.

## 🚀 Features

### 1. 📈 Habit Tracker
- Log your daily habits and view your progress over time.
- Fully integrated with a backend database so your history is always saved.

### 2. 📅 Scheduler
- A powerful To-Do list manager.
- Add tasks, set priority levels (Low, Medium, High), and assign deadlines.
- Tasks are seamlessly synced across devices via the backend API.

### 3. 🏋️ RPG Gym Plan (Advanced Calisthenics)
- A heavily gamified workout tracker.
- **Quest Tracking:** Complete your sets by checking off quests for each day.
- **EXP & Level Up System:** Earn EXP by completing exercises and clearing days. Watch your real-life skills (Handstands, Muscle-Ups, Planche) Level Up!
- **Victory Screen:** Clear the week to trigger a confetti-filled stage clear, bank your EXP, and restart the week.

### 4. 🌐 Cloudflare Tunnel Integration
- The app is routed through a secure Cloudflare Tunnel, allowing access from anywhere in the world at `peter1947.space`.

## 🛠️ Technology Stack

- **Frontend:** React + Vite (HTML5, JavaScript, Vanilla CSS)
- **Backend:** Python + Flask
- **Database:** SQLite (`habit_tracker.db`)
- **Deployment:** Cloudflared (Secure Tunnel)
- **Styling:** Custom 8-bit retro CSS (Glassmorphism + Neon colors + 'Press Start 2P' font)

## 🎮 How to Run Locally

If you are cloning this repository and want to run it on your own machine:

### 1. Start the Flask Backend
The backend serves the API and manages the SQLite database.
```bash
cd habit-tracker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
*(The backend will run on port 5055)*

### 2. Start the React Frontend
The frontend provides the unified user interface.
```bash
cd dashboard
npm install
npm run dev
```
*(The frontend will run on port 5173. The Vite config automatically proxies `/api` requests to the Flask backend.)*

## 📱 Mobile Responsive
The dashboard is designed to look and feel like a native app on mobile devices. Just navigate to the site on your iPhone, click the hamburger menu, and swap between your apps effortlessly!

---
*Created for Peter.*
