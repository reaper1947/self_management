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
