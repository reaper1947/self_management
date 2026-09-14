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
