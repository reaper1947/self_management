## Bring up Nav2

```bash
ros2 launch nav2_bringup bringup_launch.py \
  use_sim_time:=true map:=$HOME/maps/home.yaml params_file:=my_rover_bringup/config/nav2.yaml
```

In RViz: **2D Pose Estimate** to localize, then **Nav2 Goal** to test a single autonomous
drive. Fix TF / costmap / controller issues (Module 6) until one goal works reliably.

## The patrol node

```python
from rclpy.action import ActionClient
from nav2_msgs.action import NavigateToPose

class Patrol(Node):
    def __init__(self):
        super().__init__("patrol")
        self.client = ActionClient(self, NavigateToPose, "navigate_to_pose")
        self.waypoints = [(1.0, 0.5, 0.0), (2.5, 0.5, 1.57), (2.5, -1.0, 3.14)]
        self.i = 0
        self.client.wait_for_server()
        self.send_next()

    def send_next(self):
        x, y, yaw = self.waypoints[self.i % len(self.waypoints)]
        goal = NavigateToPose.Goal()
        goal.pose.header.frame_id = "map"
        goal.pose.pose.position.x = x
        goal.pose.pose.position.y = y
        goal.pose.pose.orientation.z = math.sin(yaw / 2)
        goal.pose.pose.orientation.w = math.cos(yaw / 2)
        self.client.send_goal_async(goal).add_done_callback(self.on_accepted)

    def on_accepted(self, future):
        future.result().get_result_async().add_done_callback(self.on_done)

    def on_done(self, future):
        self.i += 1
        self.send_next()
```

Now the rover loops its waypoints forever, with Nav2 handling planning, obstacle avoidance
and recoveries. Add a `/scan`-based e-stop node as a safety net.

## Self-check

- [ ] A single RViz goal drives autonomously and reliably
- [ ] The patrol node loops waypoints without intervention
- [ ] An independent e-stop node stops the robot on a close obstacle
