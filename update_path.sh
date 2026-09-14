#!/bin/bash
echo "Committing code changes..."
cd /home/next/peter_folder
git add dashboard/vite.config.js habit-tracker/app.py nginx.conf
git commit -m "feat: move dashboard to /dashboard/ subpath"
git push origin docker-method

echo "Rebuilding backend & frontend..."
sudo docker build -t self_management_dashboard .

echo "Restarting NGINX & Dashboard..."
bash start_docker.sh

echo "All done! Go to peter1947.space/dashboard"
