<!--
  Peter1947 Academy — Robotics with ROS 2: Beginner to Expert
  Single source of truth for the course. Each lesson is delimited by a
  "<!-- FILE: ... -->" marker and split into academy/seed/robotics/ by
  habit-tracker/build_seed_from_guide.py  (run, then reseed from the admin panel).
  Targets ROS 2 Humble (Ubuntu 22.04); notes for Jazzy where relevant.
-->

# Robotics with ROS 2: Beginner to Expert

_From your first node to an autonomous rover — the real ROS 2 workflow, one build at a time._

Every lesson has commands you actually run. Work through them at a terminal; reading ROS 2
without typing it does not stick.

---

<!-- FILE: 01-setup/01-what-is-ros2.md -->
ROS 2 is not an operating system and not a programming language. It's a **middleware and a
set of conventions** for building robot software out of small programs that talk to each
other over a network.

## The problem it solves

A robot needs a camera driver, a lidar driver, a localization system, a path planner, a
motor controller, a battery monitor... written by different people, in different languages,
running as different processes — often on different computers. ROS 2 gives them a common
way to **find each other and exchange data** without hard-coding who talks to whom.

## The core ideas

| Concept | What it is |
|---|---|
| **Node** | One process that does one job (e.g. `camera_driver`, `path_planner`) |
| **Topic** | A named, typed stream. Nodes **publish** to it or **subscribe** to it. Many-to-many, anonymous. |
| **Message** | The typed data on a topic (e.g. `sensor_msgs/Image`, `geometry_msgs/Twist`) |
| **Service** | A request/response call — like a function you call on another node |
| **Action** | A long-running goal with feedback and the ability to cancel (e.g. "drive to X") |
| **Parameter** | A named setting on a node, changeable at runtime |
| **TF** | The system that tracks where every coordinate frame is relative to every other |

Data flow is **publish/subscribe by default**: the planner publishes a velocity command to
`/cmd_vel`; the motor controller subscribes to `/cmd_vel`. Neither knows the other exists.

## ROS 2 vs ROS 1 (why 2)

ROS 2 was rebuilt on **DDS** (a real, industrial pub/sub standard). The practical wins:

- **No single point of failure** — no `roscore` master; discovery is peer-to-peer.
- **Real-time & embedded friendly**, multi-platform, microcontrollers via micro-ROS.
- **Quality of Service (QoS)** — reliability vs latency, chosen per topic.
- **Security** built in (SROS 2).

## Versions

ROS 2 ships one release a year, named alphabetically. This course targets **Humble
Hawksbill** (LTS, Ubuntu 22.04) and notes differences for **Jazzy Jalisco** (Ubuntu 24.04).
Pick an LTS and stick with it.

<!-- FILE: 01-setup/02-install-and-workspace.md -->
## Installing ROS 2 Humble (Ubuntu 22.04)

```bash
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

sudo apt install -y software-properties-common curl
sudo add-apt-repository universe
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
  http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

sudo apt update
sudo apt install -y ros-humble-desktop ros-dev-tools
```

No Ubuntu? Use the **`osrf/ros:humble-desktop` Docker image**.

## Sourcing

```bash
source /opt/ros/humble/setup.bash
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc   # make it automatic
```

## Your first workspace

```bash
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws
colcon build
source install/setup.bash
```

The pattern for the rest of the course:

```bash
cd ~/ros2_ws
colcon build --symlink-install     # edit Python without rebuilding
source install/setup.bash          # overlay your workspace on /opt/ros
```

> **Rule:** source `/opt/ros/humble/setup.bash` first (the *underlay*, from `~/.bashrc`),
> then your workspace's `install/setup.bash` (the *overlay*) in each project shell.

## Verify

```bash
ros2 run demo_nodes_cpp talker
ros2 run demo_nodes_py listener     # another terminal
```

`Publishing: 'Hello World: N'` / `I heard: [Hello World: N]` — two nodes you didn't write,
discovering each other over a topic.

<!-- FILE: 01-setup/03-nodes-topics-cli.md -->
The `ros2` CLI is your debugger for the whole course. Learn it well.

```bash
ros2 run demo_nodes_cpp talker      # terminal 1
ros2 run turtlesim turtlesim_node   # terminal 2
```

## Nodes

```bash
ros2 node list
ros2 node info /turtlesim           # its pubs, subs, services, actions
```

## Topics

```bash
ros2 topic list -t                  # with message types
ros2 topic info /turtle1/cmd_vel -v # pubs/subs + QoS
ros2 topic echo /turtle1/pose       # print messages live
ros2 topic hz /turtle1/pose         # rate
ros2 topic pub --rate 1 /turtle1/cmd_vel geometry_msgs/msg/Twist \
  "{linear: {x: 1.0}, angular: {z: 0.8}}"   # drive the turtle by hand
```

## Interfaces

```bash
ros2 interface show geometry_msgs/msg/Twist
```

## Services & parameters (preview)

```bash
ros2 service call /clear std_srvs/srv/Empty
ros2 param get /turtlesim background_b
ros2 param set /turtlesim background_b 255
```

## The mental model

```
[ teleop ] --/turtle1/cmd_vel (Twist)--> [ turtlesim ] --/turtle1/pose (Pose)--> [ your node ]
```

Nodes are boxes, topics are arrows, messages are the typed cargo. **90% of ROS debugging is
`ros2 topic echo` and `ros2 topic hz`** — is the data there, and fast enough?

<!-- FILE: 01-setup/04-rqt-bag-introspection.md -->
Three tools that save hours.

## rqt_graph — see the whole system

```bash
rqt_graph
```

A live diagram of every node and every topic connecting them. If two things aren't talking,
you'll see the missing arrow instantly. Untick "Debug" and "Dead sinks" for a clean view.

## rqt — plots, param editing, image view

```bash
rqt
```

Plugins: **Plot** (graph any numeric topic field over time), **Dynamic Reconfigure** /
**Parameters** (tweak node params with sliders), **Image View** (see a camera topic).

## ros2 bag — record and replay

```bash
ros2 bag record -o run1 /turtle1/pose /turtle1/cmd_vel   # record
ros2 bag record -a -o run1                               # or everything
ros2 bag info run1
ros2 bag play run1                                       # replay later, offline
```

Bags are how you **debug offline** and **build datasets**. Record a sensor run once, then
develop your perception node against the replay a hundred times.

## rqt_console — filtered logs

```bash
ros2 run rqt_console rqt_console
```

Filter node logs by level and text — far better than scrolling a terminal.

## Self-check

- [ ] I can read rqt_graph and spot a missing connection
- [ ] I recorded a bag and replayed it with `ros2 bag play`
- [ ] I plotted a live topic value in rqt

<!-- FILE: 02-rclpy/01-first-publisher.md -->
`rclpy` is the Python client library for ROS 2.

## Make a package

```bash
cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --license Apache-2.0 \
  --node-name talker my_bot
```

## The node — `my_bot/my_bot/talker.py`

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Talker(Node):
    def __init__(self):
        super().__init__("talker")
        self.pub = self.create_publisher(String, "chatter", 10)
        self.timer = self.create_timer(0.5, self.tick)   # 2 Hz
        self.i = 0

    def tick(self):
        msg = String()
        msg.data = f"hello {self.i}"
        self.pub.publish(msg)
        self.get_logger().info(f"publishing: {msg.data}")
        self.i += 1


def main():
    rclpy.init()
    node = Talker()
    try:
        rclpy.spin(node)          # process callbacks until Ctrl-C
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
```

- `create_publisher(type, topic, 10)` — the `10` is the QoS history depth.
- `create_timer(0.5, cb)` — periodic work **without blocking**. Never `time.sleep()` in a node.
- `rclpy.spin(node)` — hand control to ROS; it runs your callbacks.

## Register the entry point (`setup.py`)

```python
"console_scripts": [
    "talker = my_bot.talker:main",
],
```

## Build & run

```bash
cd ~/ros2_ws
colcon build --symlink-install --packages-select my_bot
source install/setup.bash
ros2 run my_bot talker
ros2 topic echo /chatter        # another shell
```

<!-- FILE: 02-rclpy/02-subscribers.md -->
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

<!-- FILE: 02-rclpy/03-timers-params-logging.md -->
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

<!-- FILE: 02-rclpy/04-custom-interfaces.md -->
When `std_msgs` and `geometry_msgs` don't fit, define your own message/service/action.

## Make an interfaces package

Interfaces must live in an **`ament_cmake`** package (even for Python nodes):

```bash
cd ~/ros2_ws/src
ros2 pkg create --build-type ament_cmake my_bot_interfaces
mkdir my_bot_interfaces/msg my_bot_interfaces/srv
```

`msg/WheelSpeeds.msg`:

```
float64 left
float64 right
```

`srv/SetMode.srv`:

```
string mode
---
bool ok
string message
```

## Wire it up

`package.xml`:

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```

`CMakeLists.txt`:

```cmake
find_package(rosidl_default_generators REQUIRED)
rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/WheelSpeeds.msg"
  "srv/SetMode.srv"
)
```

Build, then use it in Python:

```python
from my_bot_interfaces.msg import WheelSpeeds
```

## Self-check

- [ ] A custom `.msg` I can `ros2 topic echo`
- [ ] A custom `.srv` I can `ros2 interface show`
- [ ] My Python node imports and uses the generated types

<!-- FILE: 02-rclpy/05-launch-files.md -->
Launch files start many nodes with the right parameters and remappings in one command.

## `my_bot/launch/bringup.launch.py`

```python
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package="my_bot", executable="talker", name="talker",
            parameters=[{"max_speed": 0.4}],
            remappings=[("chatter", "robot/chatter")],
        ),
        Node(package="my_bot", executable="listener", name="listener",
             remappings=[("chatter", "robot/chatter")]),
    ])
```

Add to `setup.py` `data_files` so it installs:

```python
(os.path.join("share", package_name, "launch"), glob("launch/*.launch.py")),
```

Run:

```bash
ros2 launch my_bot bringup.launch.py
```

## Useful patterns

- **`DeclareLaunchArgument`** + **`LaunchConfiguration`** — command-line args for the launch.
- **`IncludeLaunchDescription`** — compose other packages' launch files (this is how Nav2 and
  Gazebo bringups work).
- **YAML params:** `parameters=["config/driver.yaml"]`.

## Composition

For performance, run multiple nodes in **one process** with zero-copy intra-process comms
using `ComposableNodeContainer`. Covered in the performance lesson.

## Self-check

- [ ] One `ros2 launch` command starts my whole demo
- [ ] I pass a parameter from the launch file and confirm it with `ros2 param get`
- [ ] I remap a topic name in the launch file

<!-- FILE: 03-services-actions/01-services.md -->
A service is a **synchronous request/response** call between two nodes. Use it for quick
"do this now and tell me the result" operations — not for anything long-running.

## Server

```python
from my_bot_interfaces.srv import SetMode

class ModeServer(Node):
    def __init__(self):
        super().__init__("mode_server")
        self.srv = self.create_service(SetMode, "set_mode", self.cb)
        self.mode = "idle"

    def cb(self, request, response):
        self.mode = request.mode
        response.ok = True
        response.message = f"mode is now {self.mode}"
        return response
```

## Client

```python
self.cli = self.create_client(SetMode, "set_mode")
self.cli.wait_for_service()
future = self.cli.call_async(SetMode.Request(mode="drive"))
future.add_done_callback(self.on_result)
```

**Always `call_async`** in a node. A blocking `.call()` inside a callback will deadlock the
single-threaded executor.

## From the CLI

```bash
ros2 service call /set_mode my_bot_interfaces/srv/SetMode "{mode: drive}"
```

## Self-check

- [ ] A service server + async client that changes a node's mode
- [ ] I understand why `call_async` (not `call`) inside a node
- [ ] `ros2 service call` works against my server

<!-- FILE: 03-services-actions/02-actions.md -->
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

<!-- FILE: 03-services-actions/03-qos.md -->
Quality of Service is why "my topic is publishing but my subscriber gets nothing." Publisher
and subscriber QoS must be **compatible** or DDS silently refuses the connection.

## The settings that matter

| Setting | Options | Use |
|---|---|---|
| **Reliability** | `RELIABLE` / `BEST_EFFORT` | commands & data you can't lose → reliable; high-rate sensor streams → best-effort |
| **Durability** | `VOLATILE` / `TRANSIENT_LOCAL` | `TRANSIENT_LOCAL` = late subscribers still get the last message (used for `/map`, static TF, latched config) |
| **History / depth** | `KEEP_LAST(n)` / `KEEP_ALL` | buffer size |

## Compatibility rule

A subscriber requesting **RELIABLE** will **not** connect to a **BEST_EFFORT** publisher.
The reverse is fine. Same idea for durability.

## Predefined profiles (use these)

```python
from rclpy.qos import qos_profile_sensor_data   # best-effort, small depth
self.create_subscription(LaserScan, "scan", cb, qos_profile_sensor_data)
```

`SensorDataQoS`, `SystemDefaultsQoS`, and a `TRANSIENT_LOCAL` profile for map-like topics.

## Debug

```bash
ros2 topic info /scan -v      # shows the QoS on each side
```

If counts look right but no data flows, it's almost always a QoS mismatch.

## Self-check

- [ ] I use `qos_profile_sensor_data` for lidar/camera subscriptions
- [ ] I've made a `/map`-style topic `TRANSIENT_LOCAL` and confirmed a late subscriber gets it
- [ ] I can diagnose "no data" with `ros2 topic info -v`

<!-- FILE: 03-services-actions/04-lifecycle-nodes.md -->
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

<!-- FILE: 04-tf2-urdf/01-tf2.md -->
TF2 answers one question: **"where is frame A relative to frame B, right now (or at time
t)?"** Every robot has many frames — `map`, `odom`, `base_link`, `laser`, `camera_link` —
and TF2 keeps the tree of transforms between them.

## The standard tree

```
map → odom → base_link → (laser, camera_link, imu_link, ...)
```

- `map → odom` : published by localization (AMCL / SLAM). Corrects drift.
- `odom → base_link` : published by the odometry source (wheel encoders). Smooth, drifts.
- `base_link → sensor` : **static**, from the URDF. The robot's physical geometry.

## Broadcasting

```python
from tf2_ros import TransformBroadcaster
self.tf = TransformBroadcaster(self)
t = TransformStamped()
t.header.stamp = self.get_clock().now().to_msg()
t.header.frame_id = "odom"; t.child_frame_id = "base_link"
t.transform.translation.x = x
# ... quaternion from yaw ...
self.tf.sendTransform(t)
```

Static transforms: `StaticTransformBroadcaster` (send once) or the
`static_transform_publisher` node.

## Listening

```python
from tf2_ros import Buffer, TransformListener
self.buf = Buffer(); TransformListener(self.buf, self)
tf = self.buf.lookup_transform("map", "base_link", rclpy.time.Time())
```

## Debug

```bash
ros2 run tf2_tools view_frames     # -> frames.pdf of the whole tree
ros2 run tf2_ros tf2_echo map base_link
```

**Rule:** exactly one node publishes each edge. Two nodes publishing `odom → base_link` = a
flickering, broken tree.

<!-- FILE: 04-tf2-urdf/02-urdf.md -->
URDF (Unified Robot Description Format) is an XML description of your robot's **links**
(rigid bodies) and **joints** (how they connect and move).

## Minimal example

```xml
<robot name="my_bot">
  <link name="base_link">
    <visual>
      <geometry><box size="0.3 0.2 0.1"/></geometry>
    </visual>
    <collision>
      <geometry><box size="0.3 0.2 0.1"/></geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <inertia ixx="0.01" iyy="0.01" izz="0.01" ixy="0" ixz="0" iyz="0"/>
    </inertial>
  </link>

  <link name="laser_link"/>
  <joint name="laser_joint" type="fixed">
    <parent link="base_link"/>
    <child link="laser_link"/>
    <origin xyz="0.1 0 0.15" rpy="0 0 0"/>
  </joint>
</robot>
```

Joint types: `fixed`, `continuous` (wheels), `revolute` (limited rotation), `prismatic`
(linear).

## xacro — don't write raw URDF

`xacro` adds macros, properties and math so you don't repeat yourself:

```xml
<xacro:property name="wheel_r" value="0.05"/>
<xacro:macro name="wheel" params="prefix x y">
  <link name="${prefix}_wheel"> ... </link>
  <joint name="${prefix}_wheel_joint" type="continuous"> ... </joint>
</xacro:macro>
<xacro:wheel prefix="left"  x="0" y="0.12"/>
<xacro:wheel prefix="right" x="0" y="-0.12"/>
```

```bash
xacro my_bot.urdf.xacro > my_bot.urdf
check_urdf my_bot.urdf
```

## View it

```bash
ros2 launch urdf_tutorial display.launch.py model:=my_bot.urdf.xacro
```

<!-- FILE: 04-tf2-urdf/03-robot-state-publisher.md -->
`robot_state_publisher` reads your URDF and the current joint positions, and publishes the
**`base_link → every link`** transforms so the rest of the stack (RViz, Nav2, sensors) knows
your robot's shape.

## Launch snippet

```python
import xacro
robot_description = xacro.process_file("my_bot.urdf.xacro").toxml()

Node(
    package="robot_state_publisher", executable="robot_state_publisher",
    parameters=[{"robot_description": robot_description}],
)
```

## Where do joint positions come from?

- **Fixed joints** — no input needed, RSP handles them from the URDF.
- **Moving joints (wheels, arms)** — something must publish `sensor_msgs/JointState` on
  `/joint_states`:
  - In simulation: the Gazebo `joint_state_publisher` plugin.
  - On a real robot: your driver, from the encoders.
  - For testing: `joint_state_publisher_gui` (sliders).

## Check it

```bash
ros2 topic echo /robot_description --once
ros2 run tf2_tools view_frames        # every URDF link should appear
```

Open RViz, add a **RobotModel** display, set the description topic — you should see your
robot.

## Self-check

- [ ] `robot_state_publisher` running from my xacro
- [ ] `view_frames` shows all my links under `base_link`
- [ ] RViz RobotModel renders the robot

<!-- FILE: 05-simulation/01-gazebo.md -->
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

<!-- FILE: 05-simulation/02-sensors.md -->
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

<!-- FILE: 05-simulation/03-reading-sensors.md -->
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

<!-- FILE: 06-nav2/01-nav2-overview.md -->
Nav2 is the ROS 2 navigation stack: give it a map, a pose estimate, and a goal, and it
drives the robot there while avoiding obstacles.

## The pieces

| Server | Job |
|---|---|
| **Map server** | serves the static `/map` |
| **AMCL** | localizes the robot in the map (`map → odom` TF) |
| **Planner server** | global path (e.g. NavFn, Smac) |
| **Controller server** | follows the path, avoids local obstacles (DWB, RPP, MPPI) |
| **Behavior server** | recoveries: spin, back up, wait |
| **BT Navigator** | the behavior tree that orchestrates all of the above |
| **Lifecycle manager** | brings the stack up/down in order |

## Required inputs

- **TF tree**: `map → odom → base_link → sensors` all valid.
- **`/scan`** (or other) for obstacle sensing.
- **`/odom`** and a URDF for the robot footprint.
- A **map** (from SLAM) and a **pose estimate** (2D Pose Estimate in RViz, or `/initialpose`).

## Install & bring up

```bash
sudo apt install ros-humble-navigation2 ros-humble-nav2-bringup
ros2 launch nav2_bringup navigation_launch.py params_file:=my_nav2_params.yaml
```

Then in RViz: set the initial pose, then "Nav2 Goal".

## Self-check

- [ ] I can name each Nav2 server and what it does
- [ ] My TF tree and `/scan` meet Nav2's requirements
- [ ] Nav2 brings up with no lifecycle errors

<!-- FILE: 06-nav2/02-slam-toolbox.md -->
Before Nav2 can localize, you need a map. `slam_toolbox` builds one from `/scan` + odometry
as you drive around.

## Run it

```bash
sudo apt install ros-humble-slam-toolbox
ros2 launch slam_toolbox online_async_launch.py
```

It publishes `/map` and the `map → odom` transform. Open RViz, add a **Map** display.

## Mapping technique

- Drive **slowly**. Fast turns smear the scan match.
- **Close loops** — return to a place you've been so the optimizer can correct drift.
- Cover the whole space, including into corners.

## Save the map

```bash
ros2 run nav2_map_server map_saver_cli -f ~/maps/my_space
```

Produces `my_space.yaml` + `my_space.pgm`. That's what the map server loads for navigation.

## Modes

- **online async** — mapping live while driving (what you want first).
- **localization** — load a saved serialized map and just localize (an alternative to AMCL).
- **lifelong** — keep updating a map over many sessions.

## Self-check

- [ ] A clean map of a room with closed loops
- [ ] Saved `.yaml` + `.pgm` with `map_saver_cli`
- [ ] The map looks right in RViz (walls straight, no doubled corridors)

<!-- FILE: 06-nav2/03-amcl.md -->
AMCL (Adaptive Monte-Carlo Localization) tracks the robot's pose in a **known** map using a
particle filter over `/scan` and odometry. It publishes the `map → odom` correction.

## Key params (`amcl` section of the Nav2 yaml)

| Param | Meaning |
|---|---|
| `min_particles` / `max_particles` | filter size — more = robust but slower (500–2000) |
| `alpha1..alpha5` | odometry noise model — tune to your drive type |
| `laser_model_type` | `likelihood_field` (default, good) |
| `update_min_d` / `update_min_a` | move/turn this much before re-weighting |
| `set_initial_pose` | seed a starting pose to skip the RViz click |

## Using it

1. Start Nav2 with the map loaded.
2. In RViz, **2D Pose Estimate** — click and drag where the robot actually is.
3. Drive a little — the particle cloud should **converge** tightly around the robot.
4. If it diverges: your `/scan` frame, map resolution, or odom noise model is off.

## AMCL vs slam_toolbox localization

AMCL is the classic choice and integrates seamlessly with Nav2. slam_toolbox's localization
mode can be more robust in feature-poor spaces. Try both.

## Self-check

- [ ] AMCL particle cloud converges after a short drive
- [ ] `ros2 run tf2_ros tf2_echo map base_link` gives a sane, stable pose
- [ ] I've tuned `update_min_d/a` so it updates often enough to not lag

<!-- FILE: 06-nav2/04-costmaps-planners.md -->
## Costmaps

Two costmaps, each built from **layers**:

- **Global costmap** — whole map, used by the planner. Layers: `static` (the map),
  `inflation` (a buffer around obstacles sized to your robot radius).
- **Local costmap** — a rolling window around the robot, used by the controller. Layers:
  `obstacle`/`voxel` (live `/scan`), `inflation`.

Key params: `robot_radius` (or `footprint`), `inflation_radius`, `cost_scaling_factor`,
`resolution`. **Get `robot_radius` and `inflation_radius` right first** — most "robot clips
the doorframe" or "robot refuses a gap" problems are here.

## Planners (global path)

| Plugin | Notes |
|---|---|
| **NavFn** | Dijkstra/A*, fast, classic |
| **Smac 2D / Hybrid-A\*** | Smac Hybrid respects a car-like turning radius; Smac Lattice for full kinematics |

## Controllers (path following + local avoidance)

| Plugin | Notes |
|---|---|
| **DWB** | samples velocity commands, scores by critics — very tunable |
| **RPP** (Regulated Pure Pursuit) | simple, smooth, great for differential drive — start here |
| **MPPI** | sampling-based MPC, excellent, heavier |

## Self-check

- [ ] `robot_radius` and `inflation_radius` match my real robot
- [ ] I can see both costmaps in RViz
- [ ] I've swapped the controller plugin and felt the difference

<!-- FILE: 06-nav2/05-tuning-recovery.md -->
## A tuning order that works

1. **TF & odometry** — is `odom → base_link` smooth and roughly right over 5 m? Fix this first.
2. **Costmap geometry** — `robot_radius`, `inflation_radius`, resolution.
3. **Controller** — start with **RPP**: `desired_linear_vel`, `lookahead_dist`,
   `min_approach_linear_velocity`. Get straight-line following clean before corners.
4. **Planner** — tolerance, whether to allow unknown space.
5. **Velocity/accel limits** — in the controller **and** `velocity_smoother`. Keep them
   honest to the hardware.

## Recovery behaviors

When the robot is stuck, the behavior tree runs recoveries in order: **clear costmap →
spin → back up → wait**. Tune `spin` distance and `backup` distance to your space. If the
robot recovers constantly, the real fix is upstream (localization or costmap), not the
recovery.

## Debugging a bad run

- **Path looks wrong** → global costmap / planner.
- **Path is fine but robot wanders / oscillates** → controller gains, or noisy local costmap.
- **Robot freezes** → check `ros2 topic hz /scan` and the TF tree; a stale transform stalls Nav2.
- Record a **bag** of a failed run and replay it while watching RViz.

## Self-check

- [ ] Robot follows a straight path smoothly, then handles a corner
- [ ] Recoveries fire rarely, and clear a genuine stuck state when they do
- [ ] I tuned velocity/accel limits to the real hardware

<!-- FILE: 07-advanced/01-opencv.md -->
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

<!-- FILE: 07-advanced/02-pointclouds.md -->
`sensor_msgs/PointCloud2` carries 3D points (from depth cameras, 3D lidar, stereo).

## Reading in Python

```python
import sensor_msgs_py.point_cloud2 as pc2

def on_cloud(self, msg):
    pts = pc2.read_points(msg, field_names=("x", "y", "z"), skip_nans=True)
    # pts is an iterable of (x, y, z)
```

For anything heavy, use **PCL** (via `pcl_ros`) or **Open3D** in a worker thread.

## Common operations

- **Voxel downsample** — reduce density before processing.
- **Passthrough filter** — crop to a region of interest (e.g. z ∈ [0.05, 1.5] to drop floor/ceiling).
- **Ground plane segmentation** (RANSAC) — separate floor from obstacles.
- **Euclidean clustering** — group points into objects.
- **`pointcloud_to_laserscan`** — flatten a 3D cloud to a 2D `/scan` so Nav2 can use it.

## RViz

Add a **PointCloud2** display; colour by `z` or intensity. Essential for sanity-checking
extrinsics and filters.

## Self-check

- [ ] I can iterate a PointCloud2 in Python
- [ ] I downsample + crop before any expensive step
- [ ] I converted a 3D cloud to a 2D scan for navigation

<!-- FILE: 07-advanced/03-multi-robot.md -->
Running two+ robots, or isolating a robot's topics, is done with **namespaces**.

## Namespacing a bringup

```python
GroupAction([
    PushRosNamespace("robot1"),
    IncludeLaunchDescription(... robot bringup ...),
])
```

Now every topic/service/TF frame is prefixed: `/robot1/cmd_vel`, `/robot1/scan`, and TF
frames become `robot1/base_link` (via the `frame_prefix` param on `robot_state_publisher`).

## The TF gotcha

TF is **global** — there is one tree. With multiple robots you either:

- Prefix every frame (`robot1/odom`, `robot2/odom`) and give each robot its own `map`
  frame, **or**
- Share one `map` and have each robot publish `map → robot1/odom`.

Nav2 supports namespaced bringup for exactly this.

## DDS isolation

Separate robots on separate machines: set a shared `ROS_DOMAIN_ID` to see each other, or
different IDs to isolate. For larger fleets, configure DDS discovery servers instead of
multicast.

## Self-check

- [ ] Two namespaced robots in one Gazebo world, topics cleanly separated
- [ ] TF frames are prefixed and the tree is valid for both
- [ ] I understand `ROS_DOMAIN_ID` for isolation

<!-- FILE: 07-advanced/04-executors-performance.md -->
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

<!-- FILE: 08-capstone/01-architecture.md -->
The capstone: a differential-drive rover (real or simulated) that maps a space and then
patrols it autonomously, avoiding obstacles. Here's the whole system on one page.

## Node graph

```
                 /joint_states        /odom            /scan
 [ base driver ] ───────────► [ robot_state_pub ]   [ lidar ]
       ▲                              │ TF               │
       │ /cmd_vel                     ▼                  ▼
 [ Nav2 controller ] ◄──── [ Nav2 planner ] ◄──── [ costmaps ] ◄── /scan
       │                              ▲
       │                       [ AMCL ] ◄── /map ◄── [ map server ]
       ▼
   wheels                     [ patrol node ] ──(action)──► Nav2 BT navigator
```

## Package layout

```
my_rover/
  my_rover_description/   # urdf/xacro, meshes
  my_rover_bringup/       # launch files, params (nav2.yaml, ekf.yaml)
  my_rover_driver/        # real hardware: /cmd_vel -> motors, encoders -> /odom + TF
  my_rover_nav/           # the patrol node (sends goals to Nav2)
  my_rover_sim/           # gazebo world + spawn (for development)
```

## Coordinate frames

Standard tree: `map → odom → base_link → {laser_link, imu_link}`. `base_link` at the drive
axle centre, `map` z-up (REP-103).

## Build order (next lessons)

1. Bringup + teleop (drive it manually, sim then real).
2. Map the space with slam_toolbox, save the map.
3. Nav2 up, localize, send a single goal from RViz.
4. Patrol node: loop through a list of waypoints via the Nav2 action.

<!-- FILE: 08-capstone/02-bringup-teleop.md -->
## The bringup launch

`my_rover_bringup/launch/rover.launch.py` starts:

- `robot_state_publisher` (from the xacro)
- the **driver** (real) or **Gazebo spawn + ros_gz bridge** (sim)
- `robot_localization` EKF (fuses `/wheel/odometry` + `/imu` → `/odometry/filtered` + `odom→base_link` TF)
- the lidar driver (real) — sim publishes it via the bridge

```bash
ros2 launch my_rover_bringup rover.launch.py sim:=true
```

Use a `sim` launch argument so the same file works for both.

## Teleop

```bash
sudo apt install ros-humble-teleop-twist-keyboard
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

Drive it. Verify, in RViz:

- **RobotModel** renders and moves.
- **TF**: `odom → base_link` moves smoothly, `base_link → laser_link` is fixed.
- **LaserScan** points land on the real walls as you rotate.
- `ros2 topic echo /odom` — position changes sensibly; driving a 1 m square returns you
  roughly to start (a little drift is normal).

## Self-check

- [ ] One launch command brings up the whole rover (sim and real)
- [ ] Keyboard teleop drives it
- [ ] Scan, TF and odom all look correct in RViz

<!-- FILE: 08-capstone/03-mapping.md -->
```bash
ros2 launch my_rover_bringup rover.launch.py sim:=true
ros2 launch slam_toolbox online_async_launch.py use_sim_time:=true
rviz2   # add Map, LaserScan, TF, RobotModel
```

Drive slowly with teleop and map the whole space:

- Straight passes down corridors, gentle turns.
- **Close loops** — revisit the start and known junctions.
- Watch the map in RViz; if walls double up, you're driving too fast or odom is poor.

Save:

```bash
ros2 run nav2_map_server map_saver_cli -f ~/maps/home
```

Commit `home.yaml` + `home.pgm` into `my_rover_bringup/maps/`.

> **`use_sim_time`:** every node must have `use_sim_time: true` in simulation, or TF and
> sensor timestamps won't line up and SLAM/Nav2 will behave strangely. Set it in your launch.

## Self-check

- [ ] A clean saved map of your space
- [ ] `use_sim_time` is true everywhere in sim
- [ ] Loops are closed — corridors aren't doubled

<!-- FILE: 08-capstone/04-autonomous-patrol.md -->
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

<!-- FILE: 08-capstone/05-where-next.md -->
You've built the full stack: nodes, interfaces, TF, URDF, simulation, SLAM, Nav2, and an
autonomous behavior. Where to take it:

## Deepen

- **`ros2_control`** — the proper way to structure hardware interfaces and controllers
  (diff-drive, arms). Replace your ad-hoc driver with it.
- **Behavior Trees** — write custom Nav2 BT nodes; use `BehaviorTree.CPP` for your own
  robot logic instead of a hand-rolled state machine.
- **Better perception** — an RGBD camera, `depthai`/OAK, or a proper 3D lidar; object
  detection with a trained model feeding costmap layers.
- **Multi-sensor fusion** — tune `robot_localization` with GPS for outdoor robots.

## Broaden

- **Manipulation** — MoveIt 2 for arms.
- **Fleet** — Open-RMF for coordinating multiple robots.
- **micro-ROS** — run ROS 2 nodes directly on an ESP32/Teensy for real-time motor control.

## Ship it

- Package your bringup as a set of launch files with a single entry point.
- Put `use_sim_time` behind one argument.
- Write a README that a stranger can follow to reproduce your robot.
- Record bags of good runs — they're your regression tests.

## Habits that make you an expert

Read other people's `nav2_params.yaml`. Replay bags when something breaks. Change one
variable at a time. Keep the TF tree sacred. And build the smallest thing that proves the
next idea — then grow it.
