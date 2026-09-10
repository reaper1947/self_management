Time to write a node. `rclpy` is the Python client library for ROS 2.

## Make a package

```bash
cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --license Apache-2.0 \
  --node-name talker my_bot
```

This scaffolds `my_bot/` with `package.xml`, `setup.py`, and `my_bot/talker.py`.

## The node

`~/ros2_ws/src/my_bot/my_bot/talker.py`:

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Talker(Node):
    def __init__(self):
        super().__init__("talker")
        self.pub = self.create_publisher(String, "chatter", 10)
        self.timer = self.create_timer(0.5, self.tick)   # 2 Hz
        self.i = 0

    def tick(self):
        msg = String()
        msg.data = f"hello {self.i}"
        self.pub.publish(msg)
        self.get_logger().info(f"publishing: {msg.data}")
        self.i += 1


def main():
    rclpy.init()
    node = Talker()
    try:
        rclpy.spin(node)          # process callbacks until Ctrl-C
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
```

Line by line:

- `rclpy.init()` — connect to the ROS graph.
- `super().__init__("talker")` — register the node under this name.
- `create_publisher(String, "chatter", 10)` — type, topic, **queue depth 10** (QoS history).
- `create_timer(0.5, cb)` — call `cb` every 0.5 s. This is how you do periodic work
  **without blocking** — never use `time.sleep()` in a node.
- `rclpy.spin(node)` — hand control to ROS; it runs your callbacks.

## Register the entry point

In `setup.py`, under `console_scripts`:

```python
"console_scripts": [
    "talker = my_bot.talker:main",
],
```

## Build & run

```bash
cd ~/ros2_ws
colcon build --symlink-install --packages-select my_bot
source install/setup.bash
ros2 run my_bot talker
```

Confirm it from another shell:

```bash
ros2 topic echo /chatter
ros2 topic hz /chatter        # ~2.0
```

## Self-check

- [ ] My package builds with `colcon build --packages-select my_bot`
- [ ] `ros2 run my_bot talker` logs "publishing: hello N"
- [ ] `ros2 topic echo /chatter` shows the messages at ~2 Hz
- [ ] I can explain why we use a timer instead of `time.sleep`
