## Installing ROS 2 Humble (Ubuntu 22.04)

```bash
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

sudo apt install -y software-properties-common curl
sudo add-apt-repository universe
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
  http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

sudo apt update
sudo apt install -y ros-humble-desktop ros-dev-tools
```

No Ubuntu? Use the **`osrf/ros:humble-desktop` Docker image**.

## Sourcing

```bash
source /opt/ros/humble/setup.bash
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc   # make it automatic
```

## Your first workspace

```bash
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws
colcon build
source install/setup.bash
```

The pattern for the rest of the course:

```bash
cd ~/ros2_ws
colcon build --symlink-install     # edit Python without rebuilding
source install/setup.bash          # overlay your workspace on /opt/ros
```

> **Rule:** source `/opt/ros/humble/setup.bash` first (the *underlay*, from `~/.bashrc`),
> then your workspace's `install/setup.bash` (the *overlay*) in each project shell.

## Verify

```bash
ros2 run demo_nodes_cpp talker
ros2 run demo_nodes_py listener     # another terminal
```

`Publishing: 'Hello World: N'` / `I heard: [Hello World: N]` — two nodes you didn't write,
discovering each other over a topic.
