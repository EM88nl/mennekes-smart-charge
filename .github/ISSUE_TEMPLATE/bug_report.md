---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
Steps to reproduce the behavior:
1. Configure '...'
2. Start application '...'
3. Perform action '...'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- **Node.js version**: [e.g., 18.0.0]
- **Operating System**: [e.g., Ubuntu 22.04, Raspberry Pi OS]
- **Charger Model**: [e.g., Mennekes AMTRON Compact 2.0s]
- **P1 Meter**: [e.g., Landis+Gyr E360]
- **MQTT Broker**: [e.g., Mosquitto 2.0.18]

## Configuration
```json
{
  "mqtt": {
    "broker": "mqtt://...",
    "topic": "..."
  },
  "modbus": {
    "port": "...",
    "baudRate": 57600,
    "slaveId": 50
  }
  // Include relevant config (remove sensitive info)
}
```

## Logs
```
Paste relevant log output here (from logs/app.log)
Include timestamps and context around the error
```

## Screenshots
If applicable, add screenshots to help explain your problem.

## Additional Context
Add any other context about the problem here. For example:
- When did this start happening?
- Does it happen consistently or intermittently?
- Any recent changes to your setup?

## Possible Solution
If you have an idea of what might be causing the issue, please share it here.
