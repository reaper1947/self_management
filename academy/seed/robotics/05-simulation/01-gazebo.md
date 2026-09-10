Simulation lets you develop the full stack with no hardware and no risk. This course uses
**Gazebo** (the new Gazebo Sim, formerly "Ignition") bridged to ROS 2 via **`ros_gz`**.

## Install

```bash
sudo apt install -y ros-humble-ros-gz ros-humble-ros-gz-sim
```

## Run an empty world

```bash
gz sim empty.sdf
```

## Spawn your robot

Add Gazebo tags to your URDF/xacro (or keep a separate `.sdf`), then:

```bash
ros2 run ros_gz_sim create -topic robot_description -name my_bot
```

## The bridge

`ros_gz_bridge` maps Gazebo topics ↔ ROS 2 topics:

```bash
ros2 run ros_gz_bridge parameter_bridge \
  /cmd_vel@geometry_msgs/msg/Twist@gz.msgs.Twist \
  /scan@sensor_msgs/msg/LaserScan@gz.msgs.LaserScan \
  /odom@nav_msgs/msg/Odometry@gz.msgs.Odometry
```

The `@ros_type@gz_type` syntax; direction inferred, or force with `[` / `]`.

## Differential drive

Add the `gz::sim::systems::DiffDrive` plugin to your robot SDF with your wheel joint names,
separation and radius. Now `/cmd_vel` moves the sim robot and `/odom` + wheel TF come back.

## Self-check

- [ ] My robot spawns in a Gazebo world
- [ ] `ros2 topic pub /cmd_vel ...` drives it
- [ ] `/odom` and `/scan` show up as ROS 2 topics through the bridge
