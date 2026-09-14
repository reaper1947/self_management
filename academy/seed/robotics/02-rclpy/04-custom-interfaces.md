When `std_msgs` and `geometry_msgs` don't fit, define your own message/service/action.

## Make an interfaces package

Interfaces must live in an **`ament_cmake`** package (even for Python nodes):

```bash
cd ~/ros2_ws/src
ros2 pkg create --build-type ament_cmake my_bot_interfaces
mkdir my_bot_interfaces/msg my_bot_interfaces/srv
```

`msg/WheelSpeeds.msg`:

```
float64 left
float64 right
```

`srv/SetMode.srv`:

```
string mode
---
bool ok
string message
```

## Wire it up

`package.xml`:

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```

`CMakeLists.txt`:

```cmake
find_package(rosidl_default_generators REQUIRED)
rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/WheelSpeeds.msg"
  "srv/SetMode.srv"
)
```

Build, then use it in Python:

```python
from my_bot_interfaces.msg import WheelSpeeds
```

## Self-check

- [ ] A custom `.msg` I can `ros2 topic echo`
- [ ] A custom `.srv` I can `ros2 interface show`
- [ ] My Python node imports and uses the generated types
