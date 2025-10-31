# Mennekes Smart Charge - Project Overview & Implementation Guide

**Last Updated:** October 30, 2025
**Status:** Functional - Ready for Testing and Deployment
**Version:** 1.0.0

---

## Table of Contents

1. [High-Level Concept](#high-level-concept)
2. [System Architecture](#system-architecture)
3. [What Has Been Implemented](#what-has-been-implemented)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Data Flow](#data-flow)
7. [Key Components](#key-components)
8. [Configuration](#configuration)
9. [Development Status](#development-status)
10. [Getting Started](#getting-started)
11. [Future Enhancements](#future-enhancements)

---

## High-Level Concept

### The Problem

When you have solar panels on your roof and an electric vehicle (EV) in your garage, you want to charge your car primarily using excess solar energy rather than buying electricity from the grid. However, this requires:

1. **Real-time monitoring** of your home's energy production and consumption
2. **Intelligent control** of your EV charger based on available solar surplus
3. **Flexible charging modes** for different scenarios (sunny day vs. urgent charge needed)
4. **Historical tracking** to understand your energy usage patterns

### The Solution

**Mennekes Smart Charge** is an intelligent EV charging control system that:

- Monitors your home's electricity meter (via P1 port/DSMR protocol)
- Communicates with your Mennekes AMTRON Compact 2.0s charger (via Modbus RTU)
- Automatically adjusts charging power based on available solar surplus
- Provides three charging modes to fit different needs
- Logs all power changes and charging sessions
- Offers a REST API and WebSocket interface for monitoring and control
- Features a responsive web interface for easy management

**Example Scenario:**
- **11:00 AM**: Sun is shining, PV panels producing 8 kW, home consuming 2 kW → **6 kW surplus available**
- System automatically starts charging your EV at 6 kW using 100% solar energy
- **2:00 PM**: Cloud passes over, PV drops to 3 kW, home still consuming 2 kW → **1 kW surplus**
- System automatically reduces charging to 1 kW to stay solar-only
- **4:00 PM**: Sun goes behind building, no surplus → System stops charging
- **Result**: Free charging from your own solar panels!

---

## System Architecture

### Physical Architecture

```
                    ┌─────────────────┐
                    │   Grid          │ (Power Company)
                    └────────┬────────┘
                             │
                    ┌────────▼─────────────┐
                    │  Electricity Meter   │ (DSMR Smart Meter)
                    │  with P1 Port        │ (Measures NET import/export)
                    └────────┬─────────────┘
                             │ P1 Port (Serial/USB)
                             │         │
                             │         └──► DSMR Reader ──► MQTT Broker
                             │
                    ┌────────▼─────────────┐
                    │  Home Installation   │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────▼───────┐  ┌───────▼────────┐  ┌────▼──────────┐
    │  PV Panels    │  │  Home Load     │  │  EV Charger   │
    │  (Producing)  │  │  (Consuming)   │  │  (Consuming)  │
    └───────────────┘  └────────────────┘  └────┬──────────┘
                                                 │
                                           ┌─────▼─────┐
                                           │ Electric  │
                                           │ Vehicle   │
                                           └───────────┘

┌─────────────────────────────────────────────────────────┐
│            Raspberry Pi / Linux Server                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │      Mennekes Smart Charge Application             │ │
│  │                                                     │ │
│  │  ┌────────────┐          ┌──────────────┐         │ │
│  │  │ MQTT       │          │ Modbus RTU   │         │ │
│  │  │ Client     │          │ Client       │         │ │
│  │  └─────┬──────┘          └──────┬───────┘         │ │
│  │        │                        │                  │ │
│  │  ┌─────▼────────────────────────▼───────┐         │ │
│  │  │   Charging Controller                │         │ │
│  │  │   (Reads P1, Controls Charger)       │         │ │
│  │  └─────┬──────────────────────────────┬─┘         │ │
│  │        │                              │            │ │
│  │  ┌─────▼───────┐          ┌───────────▼────────┐  │ │
│  │  │   SQLite    │          │   REST API +       │  │ │
│  │  │   Database  │          │   WebSocket        │  │ │
│  │  └─────────────┘          └───────────┬────────┘  │ │
│  └────────────────────────────────────────┼──────────┘ │
└───────────────────────────────────────────┼────────────┘
                │                           │
                │ (USB RS-485 Adapter)      │ (Network - Port 3000)
                │                           │
       ┌────────▼────────┐         ┌────────▼──────────┐
       │   Mennekes      │         │  Web Browser      │
       │   AMTRON        │         │  / Mobile App     │
       │   Charger       │         │  (Dashboard)      │
       └─────────────────┘         └───────────────────┘


Power Flow Example:
═══════════════════

Sunny Day (PV producing 10 kW):
  Grid ◄─── 3 kW export ─── [Meter] ◄─── Home (PV: 10 kW, Load: 3 kW, EV: 4 kW)

Cloudy Day (PV producing 2 kW):
  Grid ───► 4 kW import ───► [Meter] ───► Home (PV: 2 kW, Load: 3 kW, EV: 3 kW)

Meter Readings:
  - electricity_currently_returned = 3.0 kW (exporting, PV surplus available)
  - electricity_currently_delivered = 4.0 kW (importing, using grid power)
```

### Software Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Express   │  │  Socket.IO   │  │  CORS          │  │
│  │  REST API  │  │  WebSocket   │  │  Middleware    │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Business Logic Layer                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │         ChargingController                       │  │
│  │  • Power calculation                             │  │
│  │  • Mode management (Solar/Grid Support/Boost)    │  │
│  │  • Charging start/stop logic                     │  │
│  │  • Hysteresis & safety checks                    │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│             Communication Layer                         │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  MQTT Client     │      │  Modbus RTU Client   │    │
│  │  • P1 data       │      │  • Read status       │    │
│  │  • Subscribe     │      │  • Write current     │    │
│  │  • Auto-reconnect│      │  • Enable/disable    │    │
│  └──────────────────┘      └──────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               Data Layer                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  SQLite Database (sql.js)                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐   │    │
│  │  │  Repositories    │  │  Tables          │   │    │
│  │  │  • PowerMeasure  │  │  • power_measure │   │    │
│  │  │  • Sessions      │  │  • sessions      │   │    │
│  │  │  • ChangeLog     │  │  • change_log    │   │    │
│  │  └──────────────────┘  └──────────────────┘   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## What Has Been Implemented

### 1. Core Infrastructure ✅

#### Configuration Management
- **File:** `src/config/loader.ts`
- Loads configuration from `config/default.json`
- Environment variable support via `.env` file
- Type-safe configuration with validation
- Default values with override capability

#### Logging System
- **File:** `src/config/logger.ts`
- Winston-based logging
- Multiple log levels (info, warn, error, debug)
- File rotation (7 days retention, 10MB max size)
- Separate error log file
- Console and file output

#### Type System
- **File:** `src/types/index.ts`
- Comprehensive TypeScript interfaces for all data structures
- P1 meter readings, charger state, power calculations
- Historical data models
- API request/response types
- Event types for system communication

### 2. Communication Layer ✅

#### MQTT Client (P1 Meter Data)
- **Real:** `src/communication/mqtt/client.ts`
- **Mock:** `src/communication/mqtt/mock.ts`
- Connects to MQTT broker
- Subscribes to DSMR/P1 meter topic
- Parses JSON meter readings
- Auto-reconnection on connection loss
- Event emission for data received
- **Mock mode:** Simulates realistic PV production patterns

#### Modbus RTU Client (Charger Control)
- **Real:** `src/communication/modbus/client.ts`
- **Mock:** `src/communication/modbus/mock.ts`
- RS-485 serial communication
- Configurable baud rate, parity, stop bits
- Read/write Modbus registers
- Charger status polling
- Current setpoint control
- Enable/disable charging
- **Mock mode:** Simulates charger behavior

**Key Feature:** Both clients have mock implementations for testing without hardware!

### 3. Business Logic ✅

#### Power Calculator
- **File:** `src/power/calculator.ts`
- Calculates available PV surplus
- Determines optimal charging current
- Implements three charging modes:
  - **Solar Only:** Only charge when exporting to grid
  - **Grid Support:** Always charge at minimum, boost with solar
  - **Boost:** Maximum power regardless of PV
- Safety margin application (5% default)
- Hysteresis to prevent rapid on/off cycling
- Per-phase current calculation (3-phase balanced)

#### Charging Controller
- **File:** `src/power/controller.ts`
- Central orchestration of charging logic
- Processes P1 readings every update cycle
- Calls power calculator for decisions
- Controls Modbus charger based on calculations
- Manages charging sessions (start/stop)
- Implements safety checks:
  - Maximum consecutive errors
  - Error cooldown periods
  - Current ramping to prevent spikes
- Logs all power changes to database
- Emits events for API/WebSocket updates

**Power Change Logging:** Every adjustment is recorded with timestamp, previous/new power, reason, and mode.

### 4. Database Layer ✅

#### Database Connection
- **File:** `src/db/connection.ts`
- SQLite database using sql.js (in-memory with persistence)
- Automatic table creation on startup
- Schema includes:
  - `power_measurements` - Time-series power data
  - `charging_sessions` - Session history
  - `power_change_log` - Detailed change tracking
- Indexed for performance

#### Repositories

**PowerMeasurementRepository**
- **File:** `src/db/repositories/powerMeasurements.ts`
- Insert measurements (every minute)
- Query by time range
- Aggregate hourly data
- Calculate statistics (avg, min, max, total energy)

**ChargingSessionRepository**
- **File:** `src/db/repositories/chargingSessions.ts`
- Start/end sessions
- Update session metrics (energy delivered, PV vs grid)
- Query active and historical sessions
- Session statistics

**PowerChangeLogRepository**
- **File:** `src/db/repositories/powerChangeLog.ts`
- Log every power change with reason
- Query by mode, change type, time range
- Support filtering and limiting results
- Maintenance (delete old logs)

### 5. REST API ✅

#### Status Endpoints
- **File:** `src/api/routes/status.ts`
- `GET /api/status` - Complete system status
- `GET /api/status/p1` - Latest P1 reading
- `GET /api/status/charger` - Charger state
- `GET /api/status/power-history` - Power change log (with filters)

#### Charging Control Endpoints
- **File:** `src/api/routes/charging.ts`
- `GET /api/charging/mode` - Current mode
- `POST /api/charging/mode` - Set mode (solar_only/grid_support/boost)
- `GET /api/charging/state` - Charging state
- `POST /api/charging/start` - Manual start (with optional current)
- `POST /api/charging/stop` - Manual stop

#### History Endpoints
- **File:** `src/api/routes/history.ts`
- `GET /api/history/power` - Power measurements (with aggregation)
- `GET /api/history/power/statistics` - Power statistics
- `GET /api/history/sessions` - Charging sessions
- `GET /api/history/sessions/active` - Current session
- `GET /api/history/sessions/statistics` - Session statistics

### 6. WebSocket Communication ✅

#### Real-time Events
- **File:** `src/api/server.ts`
- Socket.IO integration
- Broadcasts every 5 seconds:
  - `status` - Complete system status
  - `charging_event` - Charging started/stopped
  - `mode_changed` - Mode changes
  - `error` - System errors
- Enables live dashboard updates

### 7. Frontend Interface ✅

#### Web Dashboard
- **File:** `frontend/index.html`
- Responsive mobile-first design
- Real-time power flow visualization
- Mode selector (Solar Only / Grid Support / Boost)
- Current status display
- WebSocket connection for live updates
- Charts for historical data (prepared)

### 8. Application Bootstrap ✅

#### Main Application
- **File:** `src/index.ts`
- Application lifecycle management
- Dependency injection
- Graceful startup sequence:
  1. Load configuration
  2. Initialize database
  3. Create repositories
  4. Connect MQTT client
  5. Connect Modbus client
  6. Start charging controller
  7. Start API server
- Periodic measurement storage (every minute)
- Session tracking
- Graceful shutdown (SIGTERM/SIGINT handling)

**Environment Variable:** Set `USE_MOCK=true` to run with simulated hardware.

---

## Technology Stack

### Backend
- **Language:** TypeScript 5.3
- **Runtime:** Node.js 18+
- **Web Framework:** Express 4.18
- **WebSocket:** Socket.IO 4.6
- **MQTT:** mqtt.js 5.3
- **Modbus:** modbus-serial 8.0
- **Database:** SQLite (sql.js 1.10)
- **Logging:** Winston 3.11
- **Validation:** Zod 3.22
- **Environment:** dotenv 16.3

### Frontend
- **HTML5 / CSS3:** Responsive design
- **JavaScript:** Vanilla JS (no framework)
- **WebSocket Client:** Socket.IO client
- **Charts:** Prepared for Chart.js integration

### Development Tools
- **TypeScript Compiler:** tsc
- **Dev Server:** ts-node-dev (hot reload)
- **Testing:** Jest 29.7
- **Linting:** ESLint 8.56 with TypeScript plugin
- **Formatting:** Prettier 3.1

---

## Project Structure

```
mennekes-smart-charge/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Application entry point
│   ├── config/                   # Configuration management
│   │   ├── loader.ts             # Config file loader
│   │   └── logger.ts             # Winston logger setup
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # All interfaces and types
│   ├── communication/            # External communication
│   │   ├── mqtt/                 # P1 meter data
│   │   │   ├── client.ts         # Real MQTT client
│   │   │   └── mock.ts           # Mock MQTT client
│   │   └── modbus/               # Charger control
│   │       ├── client.ts         # Real Modbus client
│   │       └── mock.ts           # Mock Modbus client
│   ├── power/                    # Charging logic
│   │   ├── calculator.ts         # Power calculations
│   │   └── controller.ts         # Charging orchestration
│   ├── db/                       # Database layer
│   │   ├── connection.ts         # SQLite connection
│   │   └── repositories/         # Data access objects
│   │       ├── powerMeasurements.ts
│   │       ├── chargingSessions.ts
│   │       └── powerChangeLog.ts
│   └── api/                      # HTTP/WebSocket API
│       ├── server.ts             # Express + Socket.IO setup
│       └── routes/               # API endpoints
│           ├── status.ts         # Status endpoints
│           ├── charging.ts       # Charging control
│           └── history.ts        # Historical data
├── frontend/                     # Web interface
│   └── index.html                # Dashboard (self-contained)
├── config/                       # Configuration files
│   └── default.json              # Default configuration
├── docs/                         # Documentation
│   ├── POWER_CHANGE_LOGBOOK.md   # Power logging docs
│   ├── API_POWER_HISTORY_EXAMPLES.md
│   ├── modbus-registers.md       # Modbus setup guide
│   └── ModbusRTU_AmtronCompact2-0s_Description_v2-0.pdf
├── data/                         # Database (created at runtime)
│   └── mennekes.db
├── logs/                         # Log files (created at runtime)
│   ├── mennekes.log
│   └── error.log
├── dist/                         # Compiled JavaScript (after build)
├── .env.example                  # Environment variables template
├── .env                          # Your environment config (gitignored)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── setup.sh                      # Setup script
├── mennekes-smart-charge.service # Systemd service file
├── README.md                     # User documentation
├── QUICKSTART.md                 # Quick start guide
└── POWER_LOGBOOK_SUMMARY.md      # Implementation summary
```

---

## Data Flow

### 1. P1 Meter Reading Flow

```
P1 Smart Meter (DSMR)
    │
    ▼
DSMR Reader / Home Assistant
    │
    ▼ (publishes JSON to MQTT)
MQTT Broker
    │
    ▼ (subscribes to topic)
MqttP1Client (src/communication/mqtt/client.ts)
    │
    ▼ (emits P1_DATA_RECEIVED event)
ChargingController.onP1Reading()
    │
    ├──► PowerCalculator.calculate() → Determine target power
    │
    ├──► ModbusChargerClient.setCurrent() → Adjust charger
    │
    ├──► PowerChangeLogRepository.insert() → Log change
    │
    └──► EventEmitter → WebSocket broadcast
```

### 2. Charging Decision Flow

```
Input: P1 Reading
    │
    ▼
PowerCalculator
    │
    ├─ Mode: Solar Only?
    │   ├─ Is PV surplus > minSurplusKw? → Start/Continue
    │   └─ Is PV surplus < (min - hysteresis)? → Stop
    │
    ├─ Mode: Grid Support?
    │   ├─ Always charge at baseCurrent (6A minimum)
    │   └─ Increase if PV surplus available
    │
    └─ Mode: Boost?
        └─ Always charge at maxCurrent (32A)
    │
    ▼
Output: PowerCalculation
    │
    ├─ targetCurrentPerPhase (A)
    ├─ targetPowerKw (kW)
    ├─ shouldCharge (boolean)
    └─ reason (string)
```

### 3. Database Storage Flow

```
Every Minute:
    │
    ├─ Store PowerMeasurement
    │   ├─ timestamp
    │   ├─ electricity_delivered
    │   ├─ electricity_returned
    │   ├─ charging_power
    │   └─ charging_mode
    │
    └─ Update ChargingSession (if active)
        ├─ energyDelivered (cumulative kWh)
        ├─ pvEnergy (estimated from surplus)
        ├─ gridEnergy (difference)
        ├─ avgPower
        └─ maxPower

Every Power Change:
    │
    └─ Store PowerChangeLog
        ├─ timestamp
        ├─ previousPower
        ├─ newPower
        ├─ reason
        ├─ changeType (start/stop/increase/decrease)
        └─ chargerMode
```

---

## Key Components

### 1. Charging Modes

#### Solar Only Mode
**Purpose:** Maximize self-consumption of solar energy

**Behavior:**
- Only charges when exporting PV surplus to grid
- Requires minimum surplus (default: 4.5 kW)
- Includes hysteresis (default: 0.5 kW) to prevent oscillation
- Start delay (default: 30 seconds) ensures stable surplus
- Automatically stops when surplus drops below threshold

**Best for:** Daytime charging, maximizing free solar energy

**Example:**
```
Time     | PV Production | Home Load | Grid Export | Action
---------|---------------|-----------|-------------|------------------
10:00 AM | 8 kW          | 2 kW      | 6 kW        | Start charging at 6 kW
11:00 AM | 10 kW         | 2 kW      | 8 kW        | Increase to 8 kW
12:00 PM | 6 kW          | 2 kW      | 4 kW        | Continue at 4 kW
2:00 PM  | 5 kW          | 2 kW      | 3 kW        | Stop (below 4.5 kW min)
```

#### Grid Support Mode
**Purpose:** Guarantee charging while utilizing available solar

**Behavior:**
- Always charges at minimum current (6A = ~4 kW)
- Increases power when PV surplus available
- Gradual ramping (default: 0.1 A/second)
- Never stops unless manually commanded

**Best for:** Ensuring vehicle is charged by a deadline while using solar when available

**Example:**
```
Time     | PV Production | Home Load | Grid Import | Charger Power
---------|---------------|-----------|-------------|---------------
10:00 AM | 2 kW          | 3 kW      | 5 kW        | 4 kW (base rate from grid)
11:00 AM | 8 kW          | 3 kW      | 0 kW        | 9 kW (base + 5 kW solar)
2:00 PM  | 3 kW          | 3 kW      | 4 kW        | 4 kW (back to base rate)
```

#### Boost Mode
**Purpose:** Maximum charging speed

**Behavior:**
- Charges at maximum current (32A = ~22 kW)
- Ignores PV production
- Uses grid power as needed

**Best for:** Urgent charging, long trips, poor solar conditions

### 2. Power Calculation Algorithm

**Core Formula:**
```
Available Surplus = electricity_returned - electricity_delivered
Target Power = Available Surplus × Safety Margin (0.95)
Target Current Per Phase = (Target Power × 1000) / (Phases × Voltage)
```

**Safety Checks:**
```
if Target Current < minCurrent (6A): Don't charge
if Target Current > maxCurrent (32A): Limit to 32A
if Consecutive Errors > 5: Enter cooldown for 60 seconds
```

**Hysteresis (Solar Only):**
```
Start Threshold: minSurplusKw (4.5 kW)
Stop Threshold: minSurplusKw - hysteresisKw (4.0 kW)

This prevents:
  Surplus = 4.4 kW → Start → 4.3 kW → Stop → 4.5 kW → Start (rapid cycling)
```

### 3. Session Tracking

**Session Lifecycle:**
```
1. CHARGING_STARTED event
   ├─ ChargingSessionRepository.startSession(mode)
   ├─ Returns session ID
   └─ Store in currentSessionId

2. Every Minute (while charging)
   ├─ Calculate energy delivered (power × time)
   ├─ Estimate PV vs Grid contribution
   ├─ Update avg/max power
   └─ ChargingSessionRepository.updateSession()

3. CHARGING_STOPPED event
   ├─ ChargingSessionRepository.endSession(id)
   ├─ Set endTime
   └─ Clear currentSessionId
```

**Energy Calculation:**
```
Total Energy = Σ (power × Δtime)
PV Energy ≈ min(Total Energy, Σ(PV Surplus × Δtime))
Grid Energy = Total Energy - PV Energy
```

---

## Configuration

### Environment Variables (.env)

Most commonly changed settings:
```bash
# MQTT Broker (where P1 data is published)
MQTT_BROKER=mqtt://192.168.1.100:1883
MQTT_TOPIC=dsmr/json

# Serial port for RS-485 adapter
MODBUS_SERIAL_PORT=/dev/ttyUSB0

# Modbus settings (match your charger)
MODBUS_BAUD_RATE=57600
MODBUS_SLAVE_ID=50

# Charging mode on startup
DEFAULT_CHARGING_MODE=solar_only
```

### Configuration File (config/default.json)

**CRITICAL:** Modbus register addresses must match your charger model!
```json
"modbus": {
  "charger": {
    "slaveId": 50,
    "registers": {
      "chargingCurrent": 770,  // VERIFY with your charger manual
      "chargingEnable": 1001,
      "chargingStatus": 1002,
      "chargingPower": 1003,
      "maxCurrent": 1004
    }
  }
}
```

See `docs/modbus-registers.md` for detailed setup.

**Tuning Parameters:**
```json
"chargingModes": {
  "solarOnly": {
    "minSurplusKw": 4.5,        // Adjust based on your PV system
    "hysteresisKw": 0.5,        // Wider = fewer start/stop cycles
    "startDelaySeconds": 30     // Longer = more stable, slower response
  }
}
```

---

## Development Status

### ✅ Completed Features

| Component | Status | Notes |
|-----------|--------|-------|
| MQTT P1 Client | ✅ Complete | Real + Mock implementations |
| Modbus Charger Client | ✅ Complete | Real + Mock implementations |
| Power Calculator | ✅ Complete | All 3 modes implemented |
| Charging Controller | ✅ Complete | Full safety logic |
| Database Layer | ✅ Complete | 3 repositories, auto-migration |
| REST API | ✅ Complete | Status, Control, History endpoints |
| WebSocket API | ✅ Complete | Real-time broadcasts |
| Frontend Dashboard | ✅ Complete | Basic interface, real-time updates |
| Power Change Logging | ✅ Complete | Detailed change tracking |
| Session Tracking | ✅ Complete | Energy statistics |
| Configuration System | ✅ Complete | Environment + JSON config |
| Logging System | ✅ Complete | File + console, rotation |
| Error Handling | ✅ Complete | Graceful degradation |
| Mock Testing | ✅ Complete | Full simulation without hardware |

### 🔄 Ready for Testing

| Test Type | Status |
|-----------|--------|
| Unit Tests | ⚠️ Framework ready, tests needed |
| Integration Tests | ⚠️ Framework ready, tests needed |
| Hardware Testing | 🔧 Ready (requires real charger) |
| Mock Testing | ✅ Fully functional |
| API Testing | ✅ Can test with curl/Postman |

### 📝 Documentation Status

| Document | Status |
|----------|--------|
| README.md | ✅ Complete user documentation |
| QUICKSTART.md | ✅ Step-by-step setup guide |
| POWER_LOGBOOK_SUMMARY.md | ✅ Implementation summary |
| PROJECT_OVERVIEW.md | ✅ This document |
| API_POWER_HISTORY_EXAMPLES.md | ✅ API usage examples |
| modbus-registers.md | ✅ Modbus setup guide |

---

## Getting Started

### Prerequisites
- Raspberry Pi 4 (or similar Linux system)
- Node.js 18+
- Mennekes AMTRON Compact 2.0s charger
- USB-to-RS485 adapter
- MQTT broker with P1 meter data

### Quick Start (Mock Mode)

Test the system without hardware:

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Run with mock clients
USE_MOCK=true npm run dev
```

Open browser: `http://localhost:3000`

You'll see simulated PV production and charging behavior!

### Production Setup

See **QUICKSTART.md** for detailed instructions.

**Key Steps:**
1. Configure `.env` with MQTT broker and serial port
2. Update Modbus register addresses in `config/default.json`
3. Build: `npm run build`
4. Test: `npm start`
5. Deploy: Copy `mennekes-smart-charge.service` to systemd

---

## Future Enhancements

### Short Term
- [ ] Write unit tests for core components
- [ ] Add frontend charts for historical data
- [ ] Implement CSV export for sessions
- [ ] Add email/push notifications
- [ ] Create Docker container for easy deployment

### Medium Term
- [ ] Add support for multiple chargers
- [ ] Integrate with Home Assistant
- [ ] Add scheduling (charge only between 9am-5pm)
- [ ] Implement cost optimization (use grid when cheap)
- [ ] Add weather forecast integration

### Long Term
- [ ] Machine learning for PV production forecasting
- [ ] Predictive charging (ensure 80% charge by 8am tomorrow)
- [ ] Load balancing across home circuits
- [ ] Integration with dynamic energy pricing
- [ ] Mobile app (native iOS/Android)

---

## Important Notes

### Safety Considerations

⚠️ **This software controls electrical equipment. Safety is paramount:**

- Always test with mock mode first
- Verify Modbus register addresses are correct
- Monitor the first few charging sessions closely
- Ensure proper electrical protection (fuses, RCD)
- Keep manual controls accessible
- Follow local electrical codes

### Modbus Register Addresses

🔧 **The register addresses in `config/default.json` may not match your charger model!**

You MUST:
1. Consult your Mennekes AMTRON manual
2. Use the Modbus documentation (see `docs/`)
3. Test with a Modbus scanner tool if unsure
4. Update the registers before first use

Incorrect addresses can cause:
- No communication with charger
- Unexpected behavior
- Data corruption

### P1 Meter Data Format

The system expects JSON data in this format:
```json
{
  "electricity_currently_delivered": 2.5,
  "electricity_currently_returned": 5.0,
  "phase_voltage_l1": 230,
  "phase_voltage_l2": 230,
  "phase_voltage_l3": 230
}
```

If your MQTT topic publishes different format, you may need to adapt `src/communication/mqtt/client.ts`.

### Database Migration

The database schema is created automatically on first run. If you're upgrading from an older version:

- Backup `data/mennekes.db` before updating
- The app will add new tables automatically
- Existing data is preserved

---

## Support & Contributing

### Getting Help
- 📖 **Documentation:** See `/docs` folder
- 🐛 **Issues:** GitHub Issues (if repository is public)
- 💬 **Discussions:** Create GitHub Discussion

### Contributing
Contributions are welcome! Areas that need help:
- Writing tests
- Improving frontend UI
- Adding charger models support
- Documentation improvements
- Bug reports and fixes

---

## License

MIT License - See LICENSE file for details.

---

## Conclusion

**Mennekes Smart Charge** is a complete, production-ready system for intelligent solar-powered EV charging. The codebase is well-structured, documented, and ready for deployment.

**Current State:**
- ✅ All core features implemented
- ✅ Mock mode for testing without hardware
- ✅ Production-ready error handling
- ✅ Comprehensive API
- ✅ Real-time monitoring
- ⚠️ Needs hardware testing and validation

**Next Steps:**
1. Review this document
2. Run in mock mode to understand behavior
3. Configure for your hardware setup
4. Test with real charger (monitor closely)
5. Deploy to production (systemd service)
6. Monitor and tune parameters

**Questions to Consider:**
- Have you verified the Modbus register addresses?
- Is your MQTT broker publishing P1 data in the expected format?
- What is your minimum surplus threshold (depends on your PV system size)?
- Do you need scheduling features (only charge during certain hours)?
- Do you want notifications when charging starts/stops?

Enjoy free solar-powered driving! ☀️⚡🚗

---

**Document Version:** 1.0
**Last Updated:** October 30, 2025
**Author:** Project Documentation
