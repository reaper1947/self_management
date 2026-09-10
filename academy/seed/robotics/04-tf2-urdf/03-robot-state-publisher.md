`robot_state_publisher` reads your URDF and the current joint positions, and publishes the
**`base_link → every link`** transforms so the rest of the stack (RViz, Nav2, sensors) knows
your robot's shape.

## Launch snippet

```python
import xacro
robot_description = xacro.process_file("my_bot.urdf.xacro").toxml()

Node(
    package="robot_state_publisher", executable="robot_state_publisher",
    parameters=[{"robot_description": robot_description}],
)
```

## Where do joint positions come from?

- **Fixed joints** — no input needed, RSP handles them from the URDF.
- **Moving joints (wheels, arms)** — something must publish `sensor_msgs/JointState` on
  `/joint_states`:
  - In simulation: the Gazebo `joint_state_publisher` plugin.
  - On a real robot: your driver, from the encoders.
  - For testing: `joint_state_publisher_gui` (sliders).

## Check it

```bash
ros2 topic echo /robot_description --once
ros2 run tf2_tools view_frames        # every URDF link should appear
```

Open RViz, add a **RobotModel** display, set the description topic — you should see your
robot.

## Self-check

- [ ] `robot_state_publisher` running from my xacro
- [ ] `view_frames` shows all my links under `base_link`
- [ ] RViz RobotModel renders the robot
