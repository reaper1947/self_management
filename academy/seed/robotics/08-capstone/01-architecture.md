The capstone: a differential-drive rover (real or simulated) that maps a space and then
patrols it autonomously, avoiding obstacles. Here's the whole system on one page.

## Node graph

```
                 /joint_states        /odom            /scan
 [ base driver ] ───────────► [ robot_state_pub ]   [ lidar ]
       ▲                              │ TF               │
       │ /cmd_vel                     ▼                  ▼
 [ Nav2 controller ] ◄──── [ Nav2 planner ] ◄──── [ costmaps ] ◄── /scan
       │                              ▲
       │                       [ AMCL ] ◄── /map ◄── [ map server ]
       ▼
   wheels                     [ patrol node ] ──(action)──► Nav2 BT navigator
```

## Package layout

```
my_rover/
  my_rover_description/   # urdf/xacro, meshes
  my_rover_bringup/       # launch files, params (nav2.yaml, ekf.yaml)
  my_rover_driver/        # real hardware: /cmd_vel -> motors, encoders -> /odom + TF
  my_rover_nav/           # the patrol node (sends goals to Nav2)
  my_rover_sim/           # gazebo world + spawn (for development)
```

## Coordinate frames

Standard tree: `map → odom → base_link → {laser_link, imu_link}`. `base_link` at the drive
axle centre, `map` z-up (REP-103).

## Build order (next lessons)

1. Bringup + teleop (drive it manually, sim then real).
2. Map the space with slam_toolbox, save the map.
3. Nav2 up, localize, send a single goal from RViz.
4. Patrol node: loop through a list of waypoints via the Nav2 action.
