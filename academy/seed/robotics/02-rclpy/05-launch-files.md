Launch files start many nodes with the right parameters and remappings in one command.

## `my_bot/launch/bringup.launch.py`

```python
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package="my_bot", executable="talker", name="talker",
            parameters=[{"max_speed": 0.4}],
            remappings=[("chatter", "robot/chatter")],
        ),
        Node(package="my_bot", executable="listener", name="listener",
             remappings=[("chatter", "robot/chatter")]),
    ])
```

Add to `setup.py` `data_files` so it installs:

```python
(os.path.join("share", package_name, "launch"), glob("launch/*.launch.py")),
```

Run:

```bash
ros2 launch my_bot bringup.launch.py
```

## Useful patterns

- **`DeclareLaunchArgument`** + **`LaunchConfiguration`** — command-line args for the launch.
- **`IncludeLaunchDescription`** — compose other packages' launch files (this is how Nav2 and
  Gazebo bringups work).
- **YAML params:** `parameters=["config/driver.yaml"]`.

## Composition

For performance, run multiple nodes in **one process** with zero-copy intra-process comms
using `ComposableNodeContainer`. Covered in the performance lesson.

## Self-check

- [ ] One `ros2 launch` command starts my whole demo
- [ ] I pass a parameter from the launch file and confirm it with `ros2 param get`
- [ ] I remap a topic name in the launch file
