Nav2 is the ROS 2 navigation stack: give it a map, a pose estimate, and a goal, and it
drives the robot there while avoiding obstacles.

## The pieces

| Server | Job |
|---|---|
| **Map server** | serves the static `/map` |
| **AMCL** | localizes the robot in the map (`map → odom` TF) |
| **Planner server** | global path (e.g. NavFn, Smac) |
| **Controller server** | follows the path, avoids local obstacles (DWB, RPP, MPPI) |
| **Behavior server** | recoveries: spin, back up, wait |
| **BT Navigator** | the behavior tree that orchestrates all of the above |
| **Lifecycle manager** | brings the stack up/down in order |

## Required inputs

- **TF tree**: `map → odom → base_link → sensors` all valid.
- **`/scan`** (or other) for obstacle sensing.
- **`/odom`** and a URDF for the robot footprint.
- A **map** (from SLAM) and a **pose estimate** (2D Pose Estimate in RViz, or `/initialpose`).

## Install & bring up

```bash
sudo apt install ros-humble-navigation2 ros-humble-nav2-bringup
ros2 launch nav2_bringup navigation_launch.py params_file:=my_nav2_params.yaml
```

Then in RViz: set the initial pose, then "Nav2 Goal".

## Self-check

- [ ] I can name each Nav2 server and what it does
- [ ] My TF tree and `/scan` meet Nav2's requirements
- [ ] Nav2 brings up with no lifecycle errors
