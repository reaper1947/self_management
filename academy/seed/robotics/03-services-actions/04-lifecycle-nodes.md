A **lifecycle (managed) node** has explicit states — `unconfigured → inactive → active →
finalized` — so a system can be brought up in a controlled order. Nav2's servers are all
lifecycle nodes.

## Why

- Allocate resources (open a device, subscribe) in `on_configure`, not in `__init__`.
- Start/stop publishing cleanly with `on_activate` / `on_deactivate`.
- A manager can configure everything, then activate everything, so nodes don't publish
  garbage during startup.

## Python sketch

```python
from rclpy.lifecycle import Node, TransitionCallbackReturn

class Sensor(Node):
    def on_configure(self, state):
        self.pub = self.create_lifecycle_publisher(Range, "range", 10)
        return TransitionCallbackReturn.SUCCESS

    def on_activate(self, state):
        self.timer = self.create_timer(0.1, self.tick)
        return super().on_activate(state)

    def on_deactivate(self, state):
        self.destroy_timer(self.timer)
        return super().on_deactivate(state)
```

## Drive transitions

```bash
ros2 lifecycle set /sensor configure
ros2 lifecycle set /sensor activate
ros2 lifecycle get /sensor
```

A **lifecycle manager** (as in Nav2) automates this for a whole stack.

## Self-check

- [ ] A lifecycle node that only publishes when `active`
- [ ] I drove it through configure → activate → deactivate from the CLI
- [ ] I understand why Nav2 uses these
