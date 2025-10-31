# Mennekes Smart Charge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-91%20passing-brightgreen)](https://github.com/EM88nl/mennekes-smart-charge)

Intelligent EV charging controller that optimizes charging based on solar surplus using P1 meter data and Modbus RTU control for Mennekes AMTRON chargers.

## 📋 Features

### 🔋 **3 Charging Modes**
- **Solar Only**: Only charge when there's solar surplus without importing from grid
  - Start threshold: 4.5 kW surplus
  - Stop threshold: 4.0 kW surplus
  - Hysteresis prevents rapid on/off cycling
- **Grid Support**: Always charge with minimum power, automatically adjusts to use solar surplus
  - Minimum: 6A charging current
  - Supplements from grid when needed
  - Increases power with available solar
- **Boost**: Charge at maximum power (32A) regardless of solar surplus

### 🧠 **Smart Logic**
- 5-minute moving average of grid flow (1-minute sample intervals)
- Checks every 5 minutes if charging power should be adjusted
- Smooths out solar fluctuations for stable charging
- Dynamic current adjustment based on available surplus

### 📊 **Real-time Monitoring**
- Grid flow updates: Every P1 meter message (~few seconds)
- Charger status updates: Every 2 seconds (configurable)
- WebSocket for live updates to connected frontends
- REST API for status and control
- Web interface for easy monitoring and control

### 🔐 **Safety Features**
- Automatic heartbeat to Modbus (every 5 seconds)
- Respects charger min/max current limits (6-32A)
- Graceful shutdown on SIGINT/SIGTERM
- Automatic reconnection for MQTT and Modbus
- Error handling and recovery mechanisms

## 🛠️ Hardware Requirements

- **EV Charger**: Mennekes AMTRON Compact 2.0s (22kW, 3-phase)
- **Serial Interface**: USB-to-RS485 adapter (e.g., `/dev/ttyUSB0`)
- **Smart Meter**: P1 meter with MQTT broker publishing DSMR data
- **Power**: 3-phase power installation (230V per phase)

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Access to P1 meter MQTT stream
- USB-to-RS485 adapter connected to Mennekes charger

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/EM88nl/mennekes-smart-charge.git
   cd mennekes-smart-charge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**

   Edit `config.json` to match your setup:
   ```json
   {
     "mqtt": {
       "broker": "mqtt://192.168.2.70",
       "topic": "dsmr/json"
     },
     "modbus": {
       "port": "/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0",
       "baudRate": 57600,
       "slaveId": 50
     },
     "charger": {
       "maxCurrent": 32,
       "minCurrent": 6,
       "voltage": 230,
       "phases": 3
     },
     "charging": {
       "solarOnly": {
         "startThresholdKw": 4.5,
         "stopThresholdKw": 4.0
       },
       "gridSupport": {
         "minimumCurrent": 6
       },
       "checkIntervalSeconds": 300,
       "movingAverageMinutes": 5,
       "statusUpdateIntervalSeconds": 2
     },
     "api": {
       "port": 3000
     }
   }
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the web interface**

   Open your browser and navigate to `http://localhost:3000`

## 🚀 Development

### Running in development mode

```bash
npm run dev
```

This starts the application with hot reload using `ts-node-dev`.

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Clean previous build
npm run clean

# Build TypeScript to JavaScript
npm run build
```

## 📡 API Documentation

### REST Endpoints

#### GET `/api/status`
Get current system status including:
- Current mode
- Charger state (EVSE state, authorization, power, session data)
- Grid flow (negative = surplus)
- Moving average
- Charging status
- Target current

**Response:**
```json
{
  "mode": "solar_only",
  "chargerState": {
    "evseState": 5,
    "authStatus": 1,
    "chargingPower": 11040,
    "sessionEnergy": 15.5,
    "sessionDuration": 3600
  },
  "gridFlow": -5.2,
  "movingAverage": -4.8,
  "charging": true,
  "authorized": true,
  "targetCurrent": 16.0,
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

#### GET `/api/mode`
Get current charging mode.

**Response:**
```json
{
  "mode": "solar_only"
}
```

#### POST `/api/mode`
Set charging mode.

**Request:**
```json
{
  "mode": "solar_only" | "grid_support" | "boost"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "solar_only"
}
```

### WebSocket Events

#### Client → Server
- `set-mode`: Change charging mode
  ```javascript
  socket.emit('set-mode', 'grid_support');
  ```

#### Server → Client
- `status`: System status update (emitted every 2 seconds and on P1 data)
- `mode-changed`: Mode changed notification
- `error`: Error notification

**Example Client:**
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('status', (status) => {
  console.log('Status update:', status);
});

socket.on('mode-changed', (mode) => {
  console.log('Mode changed to:', mode);
});

socket.emit('set-mode', 'solar_only');
```

## ⚙️ Configuration

### MQTT Broker
Configure your P1 meter MQTT broker address and topic. The application expects JSON messages in DSMR format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "electricity_currently_delivered": "0.523",
  "electricity_currently_returned": "0.000",
  "phase_currently_delivered_l1": "0.200",
  ...
}
```

### Modbus RTU
- **Port**: Serial device path (e.g., `/dev/ttyUSB0` or by-id path)
- **Baud Rate**: 57600 (default for Mennekes AMTRON)
- **Data Bits**: 8
- **Stop Bits**: 2
- **Parity**: None
- **Slave ID**: 50 (configurable on charger)

### Charging Parameters

#### Solar Only Mode
- `startThresholdKw`: Surplus required to start charging (default: 4.5 kW)
- `stopThresholdKw`: Surplus threshold to stop charging (default: 4.0 kW)
- Hysteresis gap (0.5 kW) prevents rapid cycling

#### Grid Support Mode
- `minimumCurrent`: Base charging current when no surplus (default: 6A)
- Automatically increases with available solar

#### Timing
- `checkIntervalSeconds`: How often to adjust charging (default: 300s / 5 minutes)
- `movingAverageMinutes`: Window for averaging grid flow (default: 5 minutes)
- `statusUpdateIntervalSeconds`: Charger polling interval (default: 2 seconds)

## 🔢 How It Works

### Grid Flow Calculation

```
Net Grid Flow = electricity_currently_delivered - electricity_currently_returned

Negative value = Surplus (exporting to grid, solar available)
Positive value = Importing from grid (no surplus)
```

### Current Calculation

```
Current (A) = Power (kW) × 1000 / (Voltage (V) × Phases)

Example: 11.04 kW / (230V × 3 phases) = 16A
```

### Charging Decision Flow

1. **P1 Data Arrival**: MQTT message received every few seconds
2. **Real-time Update**: Grid flow calculated and broadcast to frontend immediately
3. **Moving Average**: Sample added every minute to 5-minute rolling average
4. **Charging Check**: Every 5 minutes, evaluate if adjustment needed:
   - Calculate average grid flow over last 5 minutes
   - Determine target current based on mode and surplus
   - Apply changes via Modbus RTU
5. **Status Polling**: Charger state read every 2 seconds via Modbus

### Mode-Specific Behavior

#### Solar Only
```
if (!charging && surplus >= 4.5 kW):
    start charging
    current = surplus / (230V × 3)
    clamp between 6A and 32A

if (charging && surplus < 4.0 kW):
    stop charging
```

#### Grid Support
```
always charge:
    base_current = 6A
    if surplus > 0:
        current = 6A + (surplus / (230V × 3))
    clamp between 6A and 32A
```

#### Boost
```
always charge at 32A maximum
```

## 📝 Logging

Logs are written to:
- Console (colorized)
- `logs/app.log` (all logs)
- `logs/error.log` (errors only)

Log levels: error, warn, info, debug

Example logs:
```
info: === Mennekes Smart Charge Starting ===
info: Connected to MQTT broker
info: Connected to Modbus RTU successfully
info: Charger status polled {"evseState":5,"authStatus":1,"chargingPower":"11040.00 W","targetCurrent":"16.0 A"}
info: P1 data update {"gridFlow":"-5.20","avgSamples":5}
info: Charging adjusted {"targetCurrent":"16.0 A"}
```

## 🧪 Testing

The project includes comprehensive tests:

- **Unit Tests**: MovingAverage, calculations, data parsing
- **Integration Tests**: API endpoints, complete charging flows
- **91 tests** covering all major functionality

Run tests:
```bash
npm test
```

Coverage report:
```bash
npm run test:coverage
```

## 🐛 Troubleshooting

### MQTT Connection Issues
- Verify broker address and network connectivity
- Check MQTT topic is publishing DSMR data
- Test with `mosquitto_sub -h <broker> -t <topic>`

### Modbus Connection Issues
- Check USB-to-RS485 adapter is connected
- Verify device path: `ls -l /dev/serial/by-id/`
- Check permissions: `sudo chmod 666 /dev/ttyUSB0`
- Verify charger Modbus settings (baud rate, slave ID)

### Charging Not Starting
- Check `surplus` value in logs is above start threshold
- Verify charger authorization (RFID card)
- Check vehicle is connected and ready to charge
- Review logs for error messages

### Frontend Not Updating
- Check WebSocket connection in browser console
- Verify API server is running on correct port
- Check firewall rules

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Mennekes for the AMTRON charger and Modbus documentation
- DSMR community for P1 meter specifications
- Contributors and testers

## 📧 Contact

For questions, issues, or suggestions:
- Open an [issue](https://github.com/EM88nl/mennekes-smart-charge/issues)
- Discussions: [GitHub Discussions](https://github.com/EM88nl/mennekes-smart-charge/discussions)

## ⚠️ Disclaimer

This software is provided as-is without warranty. Use at your own risk. Always ensure your electrical installation complies with local regulations and is installed by a qualified electrician.
