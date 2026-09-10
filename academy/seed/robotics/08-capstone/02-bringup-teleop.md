## The bringup launch

`my_rover_bringup/launch/rover.launch.py` starts:

- `robot_state_publisher` (from the xacro)
- the **driver** (real) or **Gazebo spawn + ros_gz bridge** (sim)
- `robot_localization` EKF (fuses `/wheel/odometry` + `/imu` → `/odometry/filtered` + `odom→base_link` TF)
- the lidar driver (real) — sim publishes it via the bridge

```bash
ros2 launch my_rover_bringup rover.launch.py sim:=true
```

Use a `sim` launch argument so the same file works for both.

## Teleop

```bash
sudo apt install ros-humble-teleop-twist-keyboard
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

Drive it. Verify, in RViz:

- **RobotModel** renders and moves.
- **TF**: `odom → base_link` moves smoothly, `base_link → laser_link` is fixed.
- **LaserScan** points land on the real walls as you rotate.
- `ros2 topic echo /odom` — position changes sensibly; driving a 1 m square returns you
  roughly to start (a little drift is normal).

## Self-check

- [ ] One launch command brings up the whole rover (sim and real)
- [ ] Keyboard teleop drives it
- [ ] Scan, TF and odom all look correct in RViz
