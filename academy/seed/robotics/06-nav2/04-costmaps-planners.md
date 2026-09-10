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
