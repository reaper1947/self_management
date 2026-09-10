The default `rclpy.spin` is a **single-threaded executor**: one callback at a time. This is
where "my robot gets laggy under load" comes from.

## Callback groups + MultiThreadedExecutor

```python
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup, ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor

# control loop: its own group so it never waits behind slow work
self.ctrl_cbg = MutuallyExclusiveCallbackGroup()
self.create_timer(0.02, self.control, callback_group=self.ctrl_cbg)   # 50 Hz

# vision: reentrant, can overlap
self.vision_cbg = ReentrantCallbackGroup()
self.create_subscription(Image, "image", self.on_img, 10, callback_group=self.vision_cbg)

exe = MultiThreadedExecutor(num_threads=4)
exe.add_node(self)
exe.spin()
```

- **MutuallyExclusive** group: callbacks in it never run concurrently with each other.
- **Reentrant** group: callbacks can run concurrently (guard shared state yourself).

## Other performance levers

- **Composition** — run nodes in one process (`ComposableNodeContainer`) for intra-process
  zero-copy on big messages (images, clouds).
- **QoS depth** — keep it small for high-rate topics; a deep queue adds latency.
- **Don't allocate in the hot loop**; reuse message objects.
- Measure with `ros2 topic hz`, `ros2 topic delay`, and `ros2 run tf2_ros tf2_monitor`.

## Self-check

- [ ] My control loop keeps its rate even while a slow callback runs
- [ ] I use callback groups deliberately, not by accident
- [ ] I've measured end-to-end latency on a critical topic
