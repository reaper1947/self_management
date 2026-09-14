## Timers

```python
self.create_timer(0.1, self.control_loop)   # 10 Hz control loop
```

Use `self.get_clock().now()` for timestamps. For anything time-sensitive, drive it from a
timer, not a `while` loop.

## Parameters

Declare, read, and react to changes:

```python
self.declare_parameter("max_speed", 0.5)
speed = self.get_parameter("max_speed").get_parameter_value().double_value

self.add_on_set_parameters_callback(self.on_params)   # react at runtime
```

Set them from the CLI or a launch file:

```bash
ros2 run my_bot driver --ros-args -p max_speed:=0.8
ros2 param set /driver max_speed 0.3
```

## Logging

```python
self.get_logger().debug("...")   # off by default
self.get_logger().info("...")
self.get_logger().warn("...")
self.get_logger().error("...")

self.get_logger().info("spammy", throttle_duration_sec=2.0)   # rate-limit
```

Set the level: `ros2 run my_bot driver --ros-args --log-level debug`.

## Self-check

- [ ] A node with a 10 Hz timer control loop
- [ ] A declared parameter I can change with `ros2 param set` and see take effect
- [ ] I use `throttle_duration_sec` for anything logged inside a fast loop
