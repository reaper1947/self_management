#!/bin/bash
# Run this once from /opt/habit-tracker to scaffold and build the React frontend
set -e

echo "==> Installing Node.js (if not present)..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Creating Vite + React project..."
cd /opt/habit-tracker
npm create vite@latest frontend -- --template react
cd frontend

echo "==> Installing dependencies..."
npm install

echo "==> Copying main.jsx..."
cp /opt/habit-tracker/main.jsx src/main.jsx

echo "==> Patching index.html..."
# Vite default index.html is fine — main.jsx is the entry point

echo "==> Building..."
npm run build

echo "==> Copying dist to /opt/habit-tracker/dist..."
cp -r dist /opt/habit-tracker/dist

echo "==> Restarting Flask service..."
sudo systemctl restart habit-tracker

echo ""
echo "Done! Open http://192.168.10.211:5055 in your browser."