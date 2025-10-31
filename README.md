# Mennekes Smart Charge

Intelligent EV charging controller that optimizes charging based on solar surplus using P1 meter data and Modbus RTU control.

## Features

- **3 Charging Modes:**
  - **Solar Only**: Only charge when there's solar surplus without importing from grid
  - **Grid Support**: Always charge with minimum power, automatically adjusts to use solar surplus
  - **Boost**: Charge at maximum power regardless of solar surplus

- **Smart Logic:**
  - 5-minute moving average of grid flow (1-minute intervals)
  - Checks every 5 minutes if charging power should be adjusted
  - Hysteresis to prevent rapid on/off cycling

- **Real-time Updates:**
  - Grid flow updates: Every P1 meter message (~few seconds)
  - Charger status updates: Every 10 seconds (configurable)
  - WebSocket broadcasts all updates to connected frontends

- **Real-time Monitoring:**
  - WebSocket for live updates
  - REST API for status and control
  - Web interface for easy control

## Hardware Requirements

- Mennekes AMTRON Compact 2.0s (22kW)
- USB-to-RS485 adapter connected to `/dev/ttyUSB0`
- P1 meter with MQTT broker publishing DSMR data
- 3-phase power installation

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start application
npm start
```

## Development

```bash
# Run in development mode with hot reload
npm run dev
```

## Configuration

Edit `config.json` to adjust settings:

- **MQTT broker**: Address and topic for P1 meter data
- **Modbus**: Serial port, baud rate, slave ID
- **Charging thresholds**: Start/stop thresholds for solar only mode
- **Check interval**: How often to adjust charging current (default: 5 minutes)
- **Moving average**: Window size (default: 5 minutes)
- **Status update interval**: How often to poll charger and broadcast status (default: 10 seconds)

## API Endpoints

### GET /api/status
Get current system status including:
- Current mode
- Charger state (EVSE state, authorization, power, current, session data)
- Grid flow (negative = surplus)
- Moving average
- Charging status
- Target current

### GET /api/mode
Get current charging mode.

### POST /api/mode
Set charging mode.
```json
{
  "mode": "solar_only" | "grid_support" | "boost"
}
```

## WebSocket Events

### Client → Server
- `set-mode`: Change charging mode

### Server → Client
- `status`: System status update
- `mode-changed`: Mode changed

## How It Works

1. **P1 Meter Data**: Subscribes to MQTT topic for real-time grid flow data
2. **Real-time Updates**:
   - Grid flow broadcast to frontend: Every P1 message (~few seconds)
   - Charger status polled: Every 10 seconds (configurable)
3. **Moving Average**: Calculates 5-minute moving average of net grid flow (1-minute samples)
4. **Charging Decisions**: Every 5 minutes, evaluates if charging current should be adjusted
5. **Mode Logic**:
   - **Solar Only**: Starts charging at 4.5 kW surplus, stops at 4.0 kW
   - **Grid Support**: Always charges at minimum 6A, increases with surplus
   - **Boost**: Always charges at maximum 32A
6. **Modbus Control**: Sends commands to charger via Modbus RTU

## Grid Flow Calculation

```
Net Grid Flow = electricity_currently_delivered - electricity_currently_returned

Negative value = Surplus (exporting to grid, solar available)
Positive value = Importing from grid (no surplus)
```

## Safety Features

- Automatic heartbeat to Modbus (every 5 seconds)
- Respects charger min/max current limits (6-32A)
- Graceful shutdown on SIGINT/SIGTERM
- Automatic reconnection for MQTT and Modbus

## License

MIT
