#!/bin/bash
echo "Committing code changes..."
cd /home/next/peter_folder
git add habit-tracker/app.py nginx.conf dashboard/src/App.jsx ttyd.service
git commit -m "feat: seamless integrated terminal with NGINX auth_request"
git push origin docker-method

echo "Rebuilding backend & frontend..."
sudo docker build -t self_management_dashboard .

echo "Restarting NGINX & Dashboard..."
bash start_docker.sh

echo "Restarting terminal service without password..."
sudo cp /home/next/peter_folder/ttyd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart ttyd

echo "All done! Refresh your page!"
