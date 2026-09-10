The `ros2` command-line tool is how you inspect a running system. Learn it well — it's your
debugger for the rest of the course.

## Start something to look at

```bash
ros2 run demo_nodes_cpp talker      # terminal 1
ros2 run turtlesim turtlesim_node   # terminal 2
```

## Nodes

```bash
ros2 node list                      # every running node
ros2 node info /turtlesim           # its publishers, subscribers, services, actions
```

## Topics

```bash
ros2 topic list                     # all topics
ros2 topic list -t                  # with message types
ros2 topic info /turtle1/cmd_vel -v # publishers/subscribers + QoS
ros2 topic echo /turtle1/pose       # print messages as they arrive
ros2 topic hz /turtle1/pose         # publish rate
ros2 topic bw /turtle1/pose         # bandwidth
```

Publish a message by hand — drive the turtle:

```bash
ros2 topic pub --rate 1 /turtle1/cmd_vel geometry_msgs/msg/Twist \
  "{linear: {x: 1.0}, angular: {z: 0.8}}"
```

## Interfaces (message shapes)

```bash
ros2 interface list
ros2 interface show geometry_msgs/msg/Twist
```

```
Vector3  linear
Vector3  angular
```

## Services & parameters (preview)

```bash
ros2 service list
ros2 service call /clear std_srvs/srv/Empty
ros2 param list
ros2 param get /turtlesim background_b
ros2 param set /turtlesim background_b 255
```

## The mental model

```
  [ talker ] --/chatter (std_msgs/String)--> [ listener ]

  [ teleop ] --/turtle1/cmd_vel (Twist)--> [ turtlesim ] --/turtle1/pose (Pose)--> [ your node ]
```

Nodes are boxes, topics are arrows, messages are the typed cargo. **90% of ROS debugging is
`ros2 topic echo` and `ros2 topic hz`** — is the data there, and is it arriving fast
enough?

## Self-check

- [ ] I can list nodes and topics and read a topic's type
- [ ] I drove the turtle with `ros2 topic pub`
- [ ] `ros2 interface show` makes sense to me
- [ ] I can explain the talker/listener graph in one sentence
