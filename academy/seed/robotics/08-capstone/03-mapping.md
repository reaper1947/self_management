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
