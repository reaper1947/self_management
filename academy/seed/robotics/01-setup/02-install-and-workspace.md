## Installing ROS 2 Humble (Ubuntu 22.04)

```bash
# 1. locale
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

# 2. add the ROS 2 apt repo
sudo apt install -y software-properties-common curl
sudo add-apt-repository universe
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
  http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

# 3. install
sudo apt update
sudo apt install -y ros-humble-desktop ros-dev-tools
```

No Ubuntu? Use the official **`osrf/ros:humble-desktop` Docker image**, or install on
Windows. Everything in this course works the same way.

## Sourcing

ROS 2 lives behind a "setup" script you must source in every shell:

```bash
source /opt/ros/humble/setup.bash
# make it automatic:
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
```

## Your first workspace

A **workspace** is a folder where you build your own packages with `colcon`.

```bash
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws
colcon build            # builds nothing yet, but creates install/ build/ log/
source install/setup.bash
```

The pattern for the rest of the course:

```bash
cd ~/ros2_ws
colcon build --symlink-install     # --symlink-install: edit Python without rebuilding
source install/setup.bash          # "overlay" your workspace on top of /opt/ros
```

> **Rule:** source `/opt/ros/humble/setup.bash` first (the *underlay*), then your
> workspace's `install/setup.bash` (the *overlay*). Your `~/.bashrc` handles the underlay;
> you source the overlay by hand in each project shell.

## Verify

```bash
ros2 run demo_nodes_cpp talker
# in another terminal:
ros2 run demo_nodes_py listener
```

You should see `Publishing: 'Hello World: N'` and `I heard: [Hello World: N]`. That's two
nodes you didn't write, discovering each other over a topic. ROS 2 works.

## Self-check

- [ ] `ros2 --help` runs
- [ ] talker/listener demo works
- [ ] `~/ros2_ws` builds and sources cleanly
