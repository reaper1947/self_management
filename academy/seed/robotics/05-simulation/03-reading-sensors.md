Now consume sensor data in code. Two worked examples.

## A safety "bumper" from `/scan`

```python
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist
from rclpy.qos import qos_profile_sensor_data

class SafetyStop(Node):
    def __init__(self):
        super().__init__("safety_stop")
        self.pub = self.create_publisher(Twist, "cmd_vel", 10)
        self.create_subscription(LaserScan, "scan", self.on_scan, qos_profile_sensor_data)

    def on_scan(self, msg):
        front = [r for r in msg.ranges[len(msg.ranges)//2 - 15 : len(msg.ranges)//2 + 15]
                 if msg.range_min < r < msg.range_max]
        if front and min(front) < 0.4:
            self.pub.publish(Twist())            # stop
            self.get_logger().warn("obstacle — stop")
```

## Fusing odometry with an IMU (`robot_localization`)

```bash
sudo apt install ros-humble-robot-localization
```

Configure an `ekf_node` with `odom0: /wheel/odometry` and `imu0: /imu`, output on
`/odometry/filtered` and the `odom → base_link` TF. This is the standard way to get a
smoother, drift-reduced local estimate before Nav2.

## Self-check

- [ ] My safety node stops the sim robot before it hits a wall
- [ ] I can access any field of a message in a callback
- [ ] I fused wheel odom + IMU with an EKF and see `/odometry/filtered`
