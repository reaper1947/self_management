An action is for **long-running goals** with **feedback**, **result**, and the ability to
**cancel** — e.g. "navigate to (x, y)", "pick up the object".

## Anatomy

`.action` file has three parts:

```
# Goal
geometry_msgs/PoseStamped target
---
# Result
bool success
---
# Feedback
float32 distance_remaining
```

## Server (sketch)

```python
from rclpy.action import ActionServer

self._server = ActionServer(self, NavigateTo, "navigate_to", self.execute_cb)

async def execute_cb(self, goal_handle):
    fb = NavigateTo.Feedback()
    while not self.at_target(goal_handle.request.target):
        if goal_handle.is_cancel_requested:
            goal_handle.canceled()
            return NavigateTo.Result(success=False)
        fb.distance_remaining = self.dist()
        goal_handle.publish_feedback(fb)
        await asyncio.sleep(0.1)
    goal_handle.succeed()
    return NavigateTo.Result(success=True)
```

## Client / CLI

```bash
ros2 action list
ros2 action send_goal /navigate_to my_bot_interfaces/action/NavigateTo \
  "{target: {...}}" --feedback
```

Nav2 exposes `navigate_to_pose` as an action — you'll drive it from code in Module 6.

## Self-check

- [ ] An action server that publishes feedback and can be cancelled
- [ ] I sent a goal from the CLI with `--feedback`
- [ ] I can explain service vs action (quick+sync vs long+feedback+cancel)
