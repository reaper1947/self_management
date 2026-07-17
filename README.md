# 🕹️ [PLAYER 1: PETER] - Self Management Dashboard

Welcome to the **Self Management Dashboard**! This is a unified, fully responsive personal dashboard built with a cool 8-bit retro gaming aesthetic, specifically inspired by Stranger Things. It is designed to help Peter manage his daily habits, schedule tasks, chat with AI, and level up his physical fitness like an RPG.

## 🚀 Features

### 1. 📈 Habit Tracker
- Log your daily habits and view your progress over time.
- Fully integrated with a backend database so your history is always saved.

### 2. 📅 Scheduler
- A powerful To-Do list manager.
- Add tasks, set priority levels (Low, Medium, High), and assign deadlines.

### 3. 🏋️ RPG Gym Plan (Advanced Calisthenics)
- A heavily gamified workout tracker.
- **Quest Tracking:** Complete your sets by checking off quests for each day.
- **EXP & Level Up System:** Earn EXP by completing exercises and clearing days. Watch your real-life skills (Handstands, Muscle-Ups, Planche) Level Up!

### 4. 🤖 AI Terminal (Chatbot)
- Integrated with OpenRouter API.
- Talk directly to free models like Llama 3 and Gemma via an 8-bit terminal interface.
- Includes a "Short Note" section to auto-save quick thoughts.

### 5. 🔒 Security & Deployment
- Custom 8-bit Password Login Screen.
- Protected by backend session authentication.
- Routed through a secure Cloudflare Tunnel for global access at `peter1947.space`.

## 🛠️ Technology Stack

- **Frontend:** React + Vite (HTML5, JavaScript, Vanilla CSS)
- **Backend:** Python + Flask
- **Database:** SQLite (`habit_tracker.db`)
- **Deployment:** Cloudflared (Secure Tunnel)
- **Styling:** Custom 8-bit retro CSS (Stranger Things Red/Black theme + 'Press Start 2P' font)

## 🎮 How to Install and Run Locally

If you are cloning this repository and want to run it on your own machine, follow these steps carefully:

### 1. Prerequisites
- Node.js & npm (for the frontend)
- Python 3 (for the backend)
- An OpenRouter API Key (for the AI Chatbot)

### 2. Start the Flask Backend
The backend serves the API and manages the SQLite database. It requires two environment variables to run: your custom password and your OpenRouter API key.

```bash
# Navigate to the backend directory
cd habit-tracker

# Create a virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server with your custom password and OpenRouter API Key
APP_PASSWORD=your_password_here OPENROUTER_API_KEY=your_openrouter_key_here python3 app.py
```
*(The backend will run on port 5055)*

### 3. Start the React Frontend
The frontend provides the unified user interface.

```bash
# Open a NEW terminal window and navigate to the frontend directory
cd dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```
*(The frontend will run on port 5173. The Vite config automatically proxies `/api` requests to the Flask backend.)*

### 4. Access the Dashboard
Open your browser and navigate to `http://localhost:5173`. 
You will be greeted by the 8-bit login screen. Enter the password you set in the `APP_PASSWORD` variable to gain access.

## 📱 Mobile Responsive
The dashboard is designed to look and feel like a native app on mobile devices. Just navigate to the site on your iPhone, click the hamburger menu, and swap between your apps effortlessly!

---
*Created for Peter.*
