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
