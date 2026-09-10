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
