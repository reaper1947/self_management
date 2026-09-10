A service is a **synchronous request/response** call between two nodes. Use it for quick
"do this now and tell me the result" operations — not for anything long-running.

## Server

```python
from my_bot_interfaces.srv import SetMode

class ModeServer(Node):
    def __init__(self):
        super().__init__("mode_server")
        self.srv = self.create_service(SetMode, "set_mode", self.cb)
        self.mode = "idle"

    def cb(self, request, response):
        self.mode = request.mode
        response.ok = True
        response.message = f"mode is now {self.mode}"
        return response
```

## Client

```python
self.cli = self.create_client(SetMode, "set_mode")
self.cli.wait_for_service()
future = self.cli.call_async(SetMode.Request(mode="drive"))
future.add_done_callback(self.on_result)
```

**Always `call_async`** in a node. A blocking `.call()` inside a callback will deadlock the
single-threaded executor.

## From the CLI

```bash
ros2 service call /set_mode my_bot_interfaces/srv/SetMode "{mode: drive}"
```

## Self-check

- [ ] A service server + async client that changes a node's mode
- [ ] I understand why `call_async` (not `call`) inside a node
- [ ] `ros2 service call` works against my server
