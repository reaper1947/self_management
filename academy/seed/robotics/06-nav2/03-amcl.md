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
