`sensor_msgs/PointCloud2` carries 3D points (from depth cameras, 3D lidar, stereo).

## Reading in Python

```python
import sensor_msgs_py.point_cloud2 as pc2

def on_cloud(self, msg):
    pts = pc2.read_points(msg, field_names=("x", "y", "z"), skip_nans=True)
    # pts is an iterable of (x, y, z)
```

For anything heavy, use **PCL** (via `pcl_ros`) or **Open3D** in a worker thread.

## Common operations

- **Voxel downsample** — reduce density before processing.
- **Passthrough filter** — crop to a region of interest (e.g. z ∈ [0.05, 1.5] to drop floor/ceiling).
- **Ground plane segmentation** (RANSAC) — separate floor from obstacles.
- **Euclidean clustering** — group points into objects.
- **`pointcloud_to_laserscan`** — flatten a 3D cloud to a 2D `/scan` so Nav2 can use it.

## RViz

Add a **PointCloud2** display; colour by `z` or intensity. Essential for sanity-checking
extrinsics and filters.

## Self-check

- [ ] I can iterate a PointCloud2 in Python
- [ ] I downsample + crop before any expensive step
- [ ] I converted a 3D cloud to a 2D scan for navigation
