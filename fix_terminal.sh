#!/bin/bash
sudo cp /home/next/peter_folder/ttyd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart ttyd
echo "Terminal Fixed!"
