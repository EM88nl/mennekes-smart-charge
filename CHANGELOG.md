# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Mennekes Smart Charge
- Three charging modes: Solar Only, Grid Support, and Boost
- Real-time MQTT integration with P1 smart meters
- Modbus RTU control for Mennekes AMTRON chargers
- 5-minute moving average for stable charging decisions
- Web interface for monitoring and control
- REST API for system status and mode control
- WebSocket support for real-time updates
- Comprehensive logging with Winston
- Automatic reconnection for MQTT and Modbus
- Safety features: heartbeat, error handling, graceful shutdown
- Hysteresis logic to prevent rapid on/off cycling
- Configurable thresholds and parameters
- Comprehensive test suite (91 tests)
  - Unit tests for all core functionality
  - Integration tests for API endpoints
  - End-to-end charging flow tests
- Full TypeScript support
- Documentation and examples

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [1.0.0] - YYYY-MM-DD

### Added
- Initial public release

---

## Release Guidelines

### Version Format
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Categories
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Example Entry
```markdown
## [1.1.0] - 2025-02-15

### Added
- Support for single-phase charging
- New API endpoint for historical data

### Changed
- Improved moving average algorithm
- Updated frontend UI

### Fixed
- Fixed reconnection issue with MQTT broker
- Corrected current calculation for single-phase
```
