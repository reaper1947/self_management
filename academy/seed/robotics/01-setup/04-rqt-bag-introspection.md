Three tools that save hours.

## rqt_graph — see the whole system

```bash
rqt_graph
```

A live diagram of every node and every topic connecting them. If two things aren't talking,
you'll see the missing arrow instantly. Untick "Debug" and "Dead sinks" for a clean view.

## rqt — plots, param editing, image view

```bash
rqt
```

Plugins: **Plot** (graph any numeric topic field over time), **Dynamic Reconfigure** /
**Parameters** (tweak node params with sliders), **Image View** (see a camera topic).

## ros2 bag — record and replay

```bash
ros2 bag record -o run1 /turtle1/pose /turtle1/cmd_vel   # record
ros2 bag record -a -o run1                               # or everything
ros2 bag info run1
ros2 bag play run1                                       # replay later, offline
```

Bags are how you **debug offline** and **build datasets**. Record a sensor run once, then
develop your perception node against the replay a hundred times.

## rqt_console — filtered logs

```bash
ros2 run rqt_console rqt_console
```

Filter node logs by level and text — far better than scrolling a terminal.

## Self-check

- [ ] I can read rqt_graph and spot a missing connection
- [ ] I recorded a bag and replayed it with `ros2 bag play`
- [ ] I plotted a live topic value in rqt
