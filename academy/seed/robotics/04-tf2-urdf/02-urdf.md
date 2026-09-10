URDF (Unified Robot Description Format) is an XML description of your robot's **links**
(rigid bodies) and **joints** (how they connect and move).

## Minimal example

```xml
<robot name="my_bot">
  <link name="base_link">
    <visual>
      <geometry><box size="0.3 0.2 0.1"/></geometry>
    </visual>
    <collision>
      <geometry><box size="0.3 0.2 0.1"/></geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <inertia ixx="0.01" iyy="0.01" izz="0.01" ixy="0" ixz="0" iyz="0"/>
    </inertial>
  </link>

  <link name="laser_link"/>
  <joint name="laser_joint" type="fixed">
    <parent link="base_link"/>
    <child link="laser_link"/>
    <origin xyz="0.1 0 0.15" rpy="0 0 0"/>
  </joint>
</robot>
```

Joint types: `fixed`, `continuous` (wheels), `revolute` (limited rotation), `prismatic`
(linear).

## xacro — don't write raw URDF

`xacro` adds macros, properties and math so you don't repeat yourself:

```xml
<xacro:property name="wheel_r" value="0.05"/>
<xacro:macro name="wheel" params="prefix x y">
  <link name="${prefix}_wheel"> ... </link>
  <joint name="${prefix}_wheel_joint" type="continuous"> ... </joint>
</xacro:macro>
<xacro:wheel prefix="left"  x="0" y="0.12"/>
<xacro:wheel prefix="right" x="0" y="-0.12"/>
```

```bash
xacro my_bot.urdf.xacro > my_bot.urdf
check_urdf my_bot.urdf
```

## View it

```bash
ros2 launch urdf_tutorial display.launch.py model:=my_bot.urdf.xacro
```
