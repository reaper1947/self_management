`rclpy` is the Python client library for ROS 2.

## Make a package

```bash
cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --license Apache-2.0 \
  --node-name talker my_bot
```

## The node — `my_bot/my_bot/talker.py`

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

- `create_publisher(type, topic, 10)` — the `10` is the QoS history depth.
- `create_timer(0.5, cb)` — periodic work **without blocking**. Never `time.sleep()` in a node.
- `rclpy.spin(node)` — hand control to ROS; it runs your callbacks.

## Register the entry point (`setup.py`)

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
ros2 topic echo /chatter        # another shell
```
