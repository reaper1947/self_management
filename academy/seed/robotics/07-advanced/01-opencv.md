`cv_bridge` converts between ROS `sensor_msgs/Image` and OpenCV `numpy` arrays.

## Install & subscribe

```bash
sudo apt install ros-humble-cv-bridge python3-opencv
```

```python
from cv_bridge import CvBridge
import cv2

class Vision(Node):
    def __init__(self):
        super().__init__("vision")
        self.bridge = CvBridge()
        self.create_subscription(Image, "camera/image_raw", self.on_img, 10)
        self.pub = self.create_publisher(Image, "camera/annotated", 10)

    def on_img(self, msg):
        frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")
        # e.g. threshold a colour, find the largest contour, get its centroid
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, (35, 80, 80), (85, 255, 255))    # green
        M = cv2.moments(mask)
        if M["m00"] > 1000:
            cx = int(M["m10"] / M["m00"])
            cv2.circle(frame, (cx, frame.shape[0] // 2), 8, (0, 0, 255), -1)
            # publish cx as an error signal for a "follow the object" controller
        self.pub.publish(self.bridge.cv2_to_imgmsg(frame, "bgr8"))
```

## Tips

- View with `ros2 run rqt_image_view rqt_image_view`.
- Do CV work off the callback thread if it's slow (a queue + worker), or use a separate
  callback group + `MultiThreadedExecutor`.
- For real cameras, use `image_transport` / `compressed` topics to save bandwidth.

## Self-check

- [ ] A node that subscribes to a camera and republishes an annotated image
- [ ] I extract a target's pixel position and could feed it to a controller
- [ ] Heavy CV isn't blocking my other callbacks
