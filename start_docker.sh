#!/bin/bash
sudo docker run -d -p 5173:5055 -v /home/next/peter_folder/habit-tracker/habit_tracker.db:/app/habit-tracker/habit_tracker.db --env-file /home/next/peter_folder/.env --name sm_dashboard --restart unless-stopped self_management_dashboard
