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
