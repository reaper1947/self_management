Add sensors in the robot's SDF/URDF Gazebo section; the plugin publishes to a Gazebo topic
that you bridge to ROS 2.

## 2D lidar

```xml
<sensor name="lidar" type="gpu_lidar">
  <topic>scan</topic>
  <update_rate>10</update_rate>
  <lidar>
    <scan><horizontal><samples>360</samples>
      <min_angle>-3.14</min_angle><max_angle>3.14</max_angle></horizontal></scan>
    <range><min>0.15</min><max>12.0</max></range>
  </lidar>
</sensor>
```

Bridge `→ sensor_msgs/msg/LaserScan`. Frame id must match a URDF link (`laser_link`).

## Camera

`type="camera"`, bridge `→ sensor_msgs/msg/Image` (and `camera_info`). View with
`rqt_image_view` or RViz.

## IMU

`type="imu"`, bridge `→ sensor_msgs/msg/Imu`. Feed it into an EKF (`robot_localization`) to
fuse with wheel odometry.

## Depth camera / RGBD

`type="rgbd_camera"` → `Image` + `PointCloud2`.

## Reality check

Sim sensors are **clean**. Before trusting an algorithm on hardware, add noise in the SDF
(`<noise>` tags) and test again — a filter that only works on perfect data is not done.

## Self-check

- [ ] Lidar, camera and IMU all publishing as ROS 2 topics
- [ ] Each sensor's `frame_id` matches a URDF link
- [ ] I added noise to at least one sensor and re-tested
