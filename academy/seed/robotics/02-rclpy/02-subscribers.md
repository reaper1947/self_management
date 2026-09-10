A subscriber registers a callback that fires every time a message arrives.

## `my_bot/my_bot/listener.py`

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Listener(Node):
    def __init__(self):
        super().__init__("listener")
        self.sub = self.create_subscription(String, "chatter", self.on_msg, 10)

    def on_msg(self, msg):
        self.get_logger().info(f"heard: {msg.data}")


def main():
    rclpy.init()
    rclpy.spin(Listener())
    rclpy.shutdown()
```

Add `"listener = my_bot.listener:main"` to `console_scripts`, rebuild, and run alongside the
talker.

## The callback rules

- Callbacks should be **fast and non-blocking**. Do heavy work elsewhere (a timer, a thread,
  an action).
- A single-threaded executor (the default `rclpy.spin`) runs **one callback at a time**. A
  slow callback stalls everything — see the executors lesson.
- The subscription QoS must be **compatible** with the publisher's (see QoS lesson) or you
  silently receive nothing.

## A practical example — a "brake" node

Subscribe to `/scan` (a `LaserScan`), and if anything is closer than 0.4 m, publish a zero
`Twist` to `/cmd_vel`. That's a real safety node in ~20 lines — you'll build it in Module 5.

## Self-check

- [ ] talker + listener running together, listener logs each message
- [ ] I can explain why a slow callback is dangerous
- [ ] `ros2 topic info -v` shows my sub and pub with matching QoS
