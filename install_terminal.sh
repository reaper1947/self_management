#!/bin/bash
sudo apt-get update && sudo apt-get install -y ttyd
sudo cp /home/next/peter_folder/ttyd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ttyd
echo "Terminal is running on port 7681!"
