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
