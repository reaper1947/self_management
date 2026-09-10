#!/bin/bash
echo "Stopping old containers..."
sudo docker rm -f sm_dashboard self_management_proxy dashboard 2>/dev/null

echo "Creating secure Docker network..."
sudo docker network create sm_network 2>/dev/null

echo "Ensuring media directory exists (uploaded course videos/documents)..."
mkdir -p /home/next/peter_folder/media

echo "Starting Backend Dashboard..."
sudo docker run -d \
  -v /home/next/peter_folder/habit-tracker/habit_tracker.db:/app/habit-tracker/habit_tracker.db \
  -v /home/next/peter_folder/media:/app/media \
  --env-file /home/next/peter_folder/.env \
  -e MEDIA_DIR=/app/media \
  --name dashboard \
  --network sm_network \
  --restart unless-stopped \
  self_management_dashboard

echo "Starting NGINX Proxy..."
sudo docker run -d \
  -p 5173:80 \
  -v /home/next/peter_folder/nginx.conf:/etc/nginx/nginx.conf \
  --name self_management_proxy \
  --network sm_network \
  --add-host host.docker.internal:host-gateway \
  --restart unless-stopped \
  nginx:alpine

echo "System Online!"
