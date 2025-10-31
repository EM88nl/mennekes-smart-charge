# AMTRON® 4You 300, AMTRON® Compact 2.0s, AMTRON® Start 2.0s
## Modbus RTU Specification

**Doc. Revision:** 2.0  
**Date:** Mar. 21, 2024

---

## Table of Contents

1. General
2. General Information (0x0000-0x00FF)
3. Status (0x0100 - 0x02FF)
4. Configuration (0x0300 - 0x04FF)
5. Output Measurements (AC) (0x0500 - 0x06FF)
6. Settings (0x0700 - 0x08FF)
7. Input Measurements (0x0900 - 0x0AFF)
8. Charging Session (0x0B00 - 0x0CFF)
9. Functions (0x0D00 - 0x0DFF)
10. Diagnostic (0x0E00 – 0x0FFF)
11. Statistic (0x1000 – 0x1FFF)
12. Appendix with all registers and practical examples, e.g. for the use of phase change

---

## Release information

The Modbus RTU specification which is described in this document will be available for the AMTRON® 4You 300, AMTRON® Compact 2.0s and AMTRON Start 2.0s with MCU SW version 2.0 (2023.21.11024) which includes the Modbus register settings v1.0.3.

## 1. General

MENNEKES Modbus RTU uses the following default communication parameters, which can be changed with the help of the configuration tool (optional):

- Baudrate 57600 bit/s  
  *(optional 9600, 14400, 19200, 28800, 38400, 56000, 57600 bit/s)*
- 8 Data bits, 2 Stop bits, no parity  
  *(optional 8 Data bits, 1 Stop bit, even parity, 8 Data bits, 1 Stop bit, odd parity)*
- Register Word order: LowWord / HighWord
- Byte order: Big Endian HighByte / LowByte

The following functional codes can be used:

- Read:
  - READ HOLDING REGISTERS (0x03)
  - READ INPUT REGISTERS (0x04)
- Write:
  - WRITE SINGLE REGISTER (0x06) (only if data size = 1 register), e.g. writing 2 bytes into a uint16 type
  - WRITE MULTIPLE REGISTERS (0x10), e.g. writing 4 bytes into a float 32 type

### Important notes:

- If the AMTRON is configured as Satellite with help of the DIP-Switches on the baseboard, there is the address "50" already preconfigured. With help of the configuration tool, you can additionally use the alternative addresses from 10 to 50.
- To start a charging session, it is necessary to send the master heartbeat (0x55AA / 21930) at least every 10s, set the charging release to 1 and the set a charging current limitation by the energy manager to a value of at least 6A.
- It is highly recommended to change the charging current at an interval not faster than 5s and also to reduce the charging pauses to a minimum to have a high compatibility with EVs.
- Dynamic phase change is only available for 11kW devices which are configured in the appropriate way with the help of the configuration tool.
- If you use the feature of dynamic phase change, please be sure that the EV is capable of doing so. A phase change should also not be used in an intensive way to guarantee the successful charging of the connected EV.

---

## 2. General Information (0x0000-0x00FF)

Reading out this part will return basic information about the connected wallbox device.

- Modbus Version
- Firmware Version
- Serial Number

## 3. Status (0x0100 - 0x02FF)

The following registers contain general information about the status of the device.

- EVSE State
- Authorization Status (RFID & Energy Manager)
- Downgrade
- Phase Rotation
- CP State
- Signaled Current

## 4. Configuration (0x0300 - 0x04FF)

This section describes information about pre-configured settings via DIP switches or via configuration tool. Additionally, it is possible (and necessary) for the external EMS to set charging current parameters for the EVSE.

- Downgrade Current
- Charging Current Energy Manager
- Max Current House (DIP)
- Max Current EVSE
- Phase Switching Mode
- Phase Options HW
- Cable Lock
- Master Lost Fallback Current
- Grid Imbalance
- Grid Imbalance Threshold
- Grid Phases Connected
- Authorization
- Solar Supported Charging (Sunshine+) Current
- Phase Switching Pause

---

## 5. Output Measurements (AC) (0x0500 - 0x06FF)

It is possible to read the RMS current, the voltage and power on all three connected phases separately. The overall power is also available.

- Current L1
- Current L2
- Current L3
- Voltage L1
- Voltage L2
- Voltage L3
- Power L1
- Power L2
- Power L3
- Power Overall

## 6. Settings (0x0700 - 0x08FF)

Configure some basic settings.

- Maximal EVSE Current
- Phase Rotation
- Connected Phases
- Phase Usage Solar Charging
- Fallback Current Master Lost
- Solar Charging Active
- Phase Switching Pause

## 7. Input Measurements (0x0900 - 0x0AFF)

Internal values from the EVSE.

- Temperature

## 8. Charging Session (0x0B00 - 0x0CFF)

Information about the current charging session can be read in the following registers.

- Max Current Session
- Charged Energy Session
- Duration Session
- Detected EV Phases

---

## 9. Functions (0x0D00 - 0x0DFF)

The registers in the functions part allow control of the EVSE. Note that some functions have to be activated on the hardware dip-switches first.

- Heartbeat Energy Manager
- Cable Lock
- Solar Charging Mode
- Requested Phases
- Charging Release Energy Manager
- Lock EVSE
- System Restart

## 10. Diagnostic (0x0E00 – 0x0FFF)

It is also possible to get some diagnostic data from the EVSE.

- Active Error Code
- Master Lost Fallback State
- Switched Phases

In case of error codes please contact the responsible installer or MENNEKES service hotline. Further details can also be seen using the AMTRON® Compact 2.0s Configuration Tool available on the MENNEKES website https://www.mennekes.de/emobility/services/software-updates/

## 11. Statistic (0x1000 – 0x1FFF)

Information about the charging sessions in total.

- Charged Energy Total
- Charging Sessions Total

## 12. Appendix with all registers and practical examples, e.g. for the use of phase change

---

## Modbus RTU Register Specification and Examples

### Register Table

| address | R/W | function Code | bytes | type | range | Modbus version | register name | description |
|---------|-----|---------------|-------|------|-------|----------------|---------------|-------------|
| 0x0000 | R | (0x03), (0x04) | 2 | uint16 | 0...65535 / FF | v 01.00 | Modbus Version | Internal Modbus Register Layout Version (V1.0.3 = 0x0103, V1.0.3 = 0x0103) |
| 0x0001 | R | (0x03), (0x04) | 16 | ascii | - | v 01.00 | Firmware Version | Firmware Version |
| 0x0013 | R | (0x03), (0x04) | 16 | ascii | - | v 01.02 | Serial Number | Serial Number |
| | | | | | | | | Status of the charging station<br>0 = not initialized<br>1 = Idle (A1)<br>2 = EV connected (B1)<br>3 = Preconditions valid but not charging yet<br>4 = Ready to charge (B2)<br>5 = Charging (C2)<br>6 = Error<br>7 = Service Mode |
| 0x0100 | R | (0x03), (0x04) | 2 | uint16 | 0...7 | v 01.00 | EVSE State | |
| | | | | | | | | Authorization Status (RFID & Energy Manager)<br>0 = not authorized (IDLE)<br>1 = authorized (charging released)<br>2 = not authorized (charging not released) |
| 0x0101 | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.00 | Authorization Status (RFID & Energy Manager) | |
| | | | | | | | | Downgrade<br>0 = not relevant (no EV connected)<br>1 = charging current not downgraded<br>2 = charging current downgraded |
| 0x0102 | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.00 | Downgrade | |
| | | | | | | | | Order of the connected phases (relevant for load management)<br>0 = Unknown<br>1 = L2, L3, L1<br>2 = L3, L1, L2 |
| 0x0103 | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.00 | Phase Rotation | |
| | | | | | | | | State of the CP communication EVSE-EV<br>0 = n/a<br>1 = Idle (no EV)<br>11 = B1 (EV connected)<br>12 = C1 (EV ready to charge)<br>13 = C2 (charging)<br>14 = E (Error)<br>15 = F (Error)<br>26 = B1 (EV disconnected)<br>27 = B2 (EVSE ready to charge)<br>28 = C2 (charging)<br>29 = D2 |
| 0x0108 | R | (0x03), (0x04) | 2 | uint16 | 0...29 | v 01.02 | CP State | |
| 0x0114 | R | (0x03), (0x04) | 4 | float | - | v 01.03 | Signaled Current | Signaled Current to the EV |
| 0x0300 - 0x0301 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Downgrade Current | maximal charging current after automatic downgrade by the<br>charging current limitation by energy manager<br>0 = no limitation, EVSE signals maximal current (16/32A)<br>0.01...5.9 = invalid, EVSE signals 0A<br>6...x = valid, EVSE limits at the given upper limit (6...16/32A) |
| 0x0302 - 0x0303 | R/W | (0x03), (0x04)(0x06), (0x10) | 4 | float | 0...xA | v 01.00 | Charging Current Energy Manager | Remark: The EVSE will use internally the ability to interrupt the charging process |
| 0x0304 - 0x0305 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Max Current House (DIP) | Maximal installation current, configured from DIP-Switch with attention to the house installation. |
| 0x0306 - 0x0307 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Max Current EVSE | Maximal current of the EVSE as configured during the installation. |
| | | | | | | | | phase usage while using the solar algorithm<br>0 = Solar only 1 phase<br>1 = Solar only 3 phases<br>2 = Solar dynamic 1 or 3 phases |
| 0x030A | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.00 | Phase Switching Mode | |
| | | | | | | | | phase options regarding the hardware<br>0 = Phase switch disabled<br>1 = HW only 3 phases<br>2 = HW 1 or 3 phases |
| 0x030C | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.01 | Phase Options HW | |
| | | | | | | | | permanent cable lock<br>0 = not enabled or unavailable<br>1 = enabled |
| 0x030D | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.02 | Cable Lock | |
| | | | | | | | | fallback behaviour if Master (energy manager) is unavailable<br>0 = fallback disabled (charging continues as before)<br>1...31A = charging (dA)<br>6...32 = charging continues with stored value in A |
| 0x030E | R | (0x03), (0x04) | 2 | uint16 | 0...32 | v 01.02 | Master Lost Fallback Current | |
| | | | | | | | | Grid Imbalance<br>0 = disabled<br>1 = enabled |
| 0x030F | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.02 | Grid Imbalance | |
| 0x0310 | R | (0x03), (0x04) | 2 | uint16 | 10...30A | v 01.02 | Grid Imbalance Threshold | Grid Imbalance Threshold |
| | | | | | | | | Setting of the number of grid phases connected to the EVSE.<br>0 = L1<br>2 = L1, L2 and L3 |
| 0x0311 | R | (0x03), (0x04) | 2 | uint16 | 0...2 | v 01.02 | Grid Phases Connected | |
| | | | | | | | | Authorization<br>0 = disabled<br>1 = enabled |
| 0x0312 | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.02 | Authorization | |
| 0x0313 | R | (0x03), (0x04) | 2 | uint16 | 6...32A | v 01.02 | Solar Supported Charging (Sunshine+) Current | maximal charging current in Solar supported charging (Sunshine+) mode |
| 0x0314 | R | (0x03), (0x04) | 2 | uint16 | 0...1200 | v 01.02 | Phase Switching Pause | minimum time between dynamic phase switch |
| 0x0500 - 0x0501 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Current L1 | RMS output current of phase L1 |
| 0x0502 - 0x0503 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Current L2 | RMS output current of phase L2 |
| 0x0504 - 0x0505 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Current L3 | RMS output current of phase L3 |
| 0x0506 - 0x0507 | R | (0x03), (0x04) | 4 | float | 0...xV | v 01.00 | Voltage L1 | RMS output voltage of phase L1 |
| 0x0508 - 0x0509 | R | (0x03), (0x04) | 4 | float | 0...xV | v 01.00 | Voltage L2 | RMS output voltage of phase L2 |
| 0x050A - 0x050B | R | (0x03), (0x04) | 4 | float | 0...xV | v 01.00 | Voltage L3 | RMS output voltage of phase L3 |
| 0x050C - 0x050D | R | (0x03), (0x04) | 4 | float | -xW...0...-xW | v 01.00 | Power L1 | actual Power on phase L1 |
| 0x050E - 0x050F | R | (0x03), (0x04) | 4 | float | -xW...0...-xW | v 01.00 | Power L2 | actual Power on phase L2 |
| 0x0510 - 0x0511 | R | (0x03), (0x04) | 4 | float | -xW...0...-xW | v 01.00 | Power L3 | actual Power on phase L3 |
| 0x0512 - 0x0513 | R | (0x03), (0x04) | 4 | float | -xW...0...-xW | v 01.00 | Power Overall | actual Power on all connected phases |
| | | | | | | | | Maximal current of the wallbox<br>0 = 32A in 22kW EVSE, 16A in 11kW EVSE<br>1 = 25A in 22kW EVSE, 16A in 11kW EVSE<br>2 = 20A in 22kW EVSE, 16A in 11kW EVSE<br>3 = 16A<br>4 =13A<br>5 =10A<br>6 = 6A |
| 0x0706 | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...6 | v 01.03 | Maximal EVSE Current | |
| | | | | | | | | Phase rotation on grid side on the input of the EVSE:<br>0 = L1 = L1, L2 = L2, L3 = L3 (no rotation)<br>1 = L1 = L3, L2 = L1, L3 = L2<br>2 = L1 = L2, L2 = L3, L3 = L1 |
| 0x070A | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...2 | v 01.03 | Phase Rotation | |
| | | | | | | | | Number of grid connected phases to the grid<br>0: L1 is connected<br>2: L1, L2, L3 are connected |
| 0x0710 | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...2 | v 01.03 | Connected Phases | |
| | | | | | | | | Solar mode<br>0 = 1ph for 7.4kW, 3ph for 11/22kW<br>1 = use always one phase<br>2 = use always three phases<br>3 = dynamic phase switch |
| 0x071A | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...3 | v 01.03 | Phase Usage Solar Charging | |
| | | | | | | | | Fallback handling enabled<br>0 = Fallback handling disabled, EVSE will not change the last received master values<br>1 = Fallback handling enabled, EVSE will pause charging on heartbeat timeout |
| 0x073A | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...32 | v 01.03 | Fallback Current Master Lost | |
| | | | | | | | | Solar Mode<br>Internal Solar Modes can be indicated with the help of the Solar LEDs.<br>0 = Solar Modes are not active (DIP7 bank S1 *OFF)<br>1 = Solar Modes are active (DIP7 bank S1 *ON) |
| 0x073C | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...1 | v 01.03 | Solar Charging Active | |
| 0x076C | R/W | (0x03), (0x04), (0x06), (0x10) | 2 | uint16 | 0...1200 | v 01.03 | Phase Switching Pause | Time between a phase switch from 1 to 3 phase and vice versa (in seconds) |
| 0x0900 - 0x0901 | R | (0x03), (0x04) | 4 | float | -xºC...20 ...xºC | v 01.02 | Temperature | Temperature (in) inside the EVSE |
| 0x0B00 - 0x0B01 | R | (0x03), (0x04) | 4 | float | 0...xA | v 01.00 | Max Current Session | Max charging current, evaluated out of all sources that could restrict the maximal allowed current and are static during one session (Installation, Charging Cable...). |
| 0x0B02 - 0x0B03 | R | (0x03), (0x04) | 4 | float | 0...xWh | v 01.00 | Charged Energy Session | charged energy of the current session |
| 0x0B04 - 0x0B05 | R | (0x03), (0x04) | 4 | uint32 | 0...xs | v 01.00 | Duration Session | duration of the current charging session |
| | | | | | | | | Maximum number of the detected phases of the EV during a charging session.<br>0 = no phase detected<br>1 = 1 phase detected<br>2 = 2 phases detected<br>3 = 3 phases detected |
| 0x0B06 | R | (0x03), (0x04) | 2 | uint16 | 0...3 | v 01.02 | Detected EV Phases | |
| | | | | | | | | A master heartbeat with the value 0x55AA has to be sent at least every 10s by the energy manager to keep the system alive. |
| 0x0D00 | W | (0x06) | 2 | uint16 | - | v 01.00 | Heartbeat Energy Manager | |
| | | | | | | | | locking status of the cable<br>0 = cable locking unknown<br>1 = cable unlocked<br>2 = cable locked<br>3 = EVSE with fixed cable |
| 0x0D02 | R | (0x03), (0x04) | 2 | uint16 | 0...3 | v 01.00 | Cable Lock | |
| | | | | | | | | active charge mode<br>0 = solar charging mode not active<br>1 = Solar charging [Optimal Charge] Mode<br>2 = Solar charging [Sunshine] Mode<br>3 = Solar supported charging [Sunshine+] Mode<br>Remark: This triggers only the HMI, the energy manager is responsible for the solar algorithms. Solar Mode has to be activated by DIP 7, too. |
| 0x0D03 | R/W | (0x03), (0x04), (0x06) | 2 | uint16 | 0...3 | v 01.00 | Solar Charging Mode | |
| | | | | | | | | requested phases when using dynamic phase usage<br>0 = regular charging on all available phases<br>1 = force charging on 1 phase only<br>Remark: EVSE has to support this technically (see register 0x030C). If not, write function will be ignored.<br>Remark2: If EVSE does not support automatically by the EVSE regarding to CharIN guidelines including the switching pause as set in register 0x0314. |
| 0x0D04 | R/W | (0x03), (0x04), (0x06) | 2 | uint16 | 0...1 | v 01.00 | Requested Phases | |
| | | | | | | | | Charging Release Energy Manager<br>0 = charging is not allowed (relais are opened)<br>1 = charging is allowed (relais are closed) |
| 0x0D05 | R/W | (0x03), (0x04), (0x06) | 2 | uint16 | 0...1 | v 01.00 | Charging Release Energy Manager | |
| | | | | | | | | lock charging<br>0 = EVSE is not locked<br>1 = EVSE is locked |
| 0x0D06 | R/W | (0x03), (0x04), (0x06) | 2 | uint16 | 0...1 | v 01.00 | Lock EVSE | |
| | | | | | | | | Request Restart Application 0xBB to activate<br>Only use this function if the system is in IDLE state. |
| 0x0D19 | W | (0x06) | 2 | uint16 | - | v 01.03 | System Restart | |
| | | | | | | | | error code in case of an active error<br>0 = no error active |
| 0x0E00 | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.00 | Active Error Code | |
| | | | | | | | | Master lost fallback state<br>0 = valid (master available)<br>1 = active (energy manager un-available) |
| 0x0E01 | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.02 | Master Lost Fallback State | |
| | | | | | | | | information what phase is used or will be used if the EVSE will close the charging relay<br>0 = charging on all available phases<br>1 = only 1 phase charging |
| 0x0E02 | R | (0x03), (0x04) | 2 | uint16 | 0...1 | v 01.02 | Switched Phases | |
| 0x1000 | R | (0x03), (0x04) | 4 | float | 0...xWh | v 01.02 | Charged Energy Total | Cumulated charged energy in kWh on the AC-Port of the EVSE of all time. Not usable for billing. |
| 0x1002 | R | (0x03), (0x04) | 4 | uint32 | 0...x | v 01.02 | Charging Sessions Total | Total number of the charging sessions. |

---

### Function Code Information

| | Read: READ HOLDING REGISTERS (0x03) or READ MULTIPLE REGISTERS (0x04) Write: WRITE SINGLE REGISTER (0x06) for w/r (if data size = 1 register) or WRITE MULTIPLE REGISTERS (0x10) |
|---|---|
| **function code** | |
| **byte parameter (default)** | Baudrate 57600, 8 Data bits, no parity, 2 stop bits |
| **byte order** | Big endian |

---

## Practical Examples

| row | address | register name | R/W | possible value | interpretation |
|-----|---------|---------------|-----|----------------|----------------|
| 1 | | | | | **Minimum requirements for loading with a EMS** |
| 2 | 0xD00 | Heartbeat Energy Manager | Write | 0x55AA / 21930 | EMS signals standby. Interval: <10s (note package runtime) |
| 3 | 0xD05 | Charging Release Energy Manager | Write | 1 = charging is allowed | EMS signals the wallbox to charge. |
| 4 | 0x0302 | Charging Current Energy Manager | Write | 6A | EMS writes a valid current to the EVSE (6...16/32A). Values are automatically limited by the configuration of the wallbox. |
| 5 | | | | | **Read out of the wallbox configuration** |
| 6 | 0x0100 | EVSE State | Read | 1 = idle (A1) | Wallbox has booted, no EV connected. |
| 7 | 0xD03 | Solar Charging Mode | Read | 2 = Solar Charging Mode | Wallbox set to solar charging via button set to Solar charging mode (Sunshine). |
| 8 | 0x030A | Phase Switching Mode | Read | 2 = Solar dynamic 1 or 3 phases | Wallbox tells the EMS, that<br>1. wallbox is capable of dynamic phase switching in terms of hardware.<br>2. the "dynamic phase change" setting is set in the configuration tool. |
| 9 | 0x0D04 | Requested Phases | Write | 1 = force charging on 1 phase only | Based on its relevant criteria, the EMS decides that the load should only be started with one phase, e.g.<br>- PV production is too low<br>- state of charge of the PV house battery is too low<br>- outgoing power of the PV house battery restricts more power<br>- other house consumers have a higher priority<br>- other reasons |
| 10 | 0x0100 | EVSE State | Read | 2 = EV connected (B1) | EV plugged in, not charging yet. |
| 11 | 0x0B00 | Max Current Session | Read | 16A | The wallbox is limited to 16A charging current. |
| 12 | 0x0100 | EVSE State | Read | 3 = Preconditions valid but not charging yet | Self-test OK, other external reasons are blocking the charging release (e.g. no charging release by EMS). |
| 13 | | | | | **Situation changes regarding available energy, PV surplus > 230V * 6A for x-minutes** |
| 14 | 0x0302 | Charging Current Energy Manager | Write | 6A | EMS writes a valid current to the wallbox. |
| 15 | 0xD05 | Charging Release Energy Manager | Write | 1 = charging is allowed | EMS tells the wallbox to charge. |
| 16 | 0x0100 | EVSE State | Read | 4 = Ready to charge (B2) | All criteria in the wallbox are fulfilled, the EV gets a ready for charge. |
| 17 | 0x0100 | EVSE State | Read | 5 = Charging (C2) | EV has reacted via CP state C2 |
| 18 | | | | | **Charging active, PV surplus increases, charging current is adjusted** |
| 19 | 0x0302 | Charging Current Energy Manager | Write | 7A | EMS writes a valid current to the wallbox. |
| 20 | 0x0302 | Charging Current Energy Manager | Write | 10A | EMS writes a valid current to the wallbox. **Change charge current only at intervals >5s.** |
| 21 | 0x0302 | Charging Current Energy Manager | Write | 8A | EMS writes a valid current to the wallbox. |
| 22 | 0x0302 | Charging Current Energy Manager | Write | 11A | EMS writes a valid current to the wallbox. |
| 23 | 0x0302 | Charging Current Energy Manager | Write | 16A | EMS writes a valid current to the wallbox. |
| 24 | | | | | **Situation requires switching to three phases, e.g. caused by 5kW PV surplus** |
| 25 | 0xD04 | Requested Phases | Write | 0 = regular charging on all available phases | Based on its relevant criteria, EMS decides that charging should be continued with three phases.<br>Object 0x030A "Phase Switching Mode" shows that this is possible on this hardware. |
| 26 | | | | | **Wallbox triggers a phase switch, CP status D, no charging** |
| 27 | 0x0302 | Charging Current Energy Manager | Write | 7.2A (500W/230V/3 Phases) | EMS updates the charging current, as this now applies to 3 phases. |
| 28 | 0x0100 | EVSE State | Read | 5 = Charging (C2) | Charging current will go to 0 within the phase change, no explicit status for the phase change necessary. |
| 29 | 0x0100 | EVSE State | Read | 4 = Ready to charge (B2) | Phase change sequence takes place, wallbox offers a ready to charge. |
| 30 | 0x0100 | EVSE State | Read | 5 = Charging (C2) | EV reacts again with CP-C2 and charging continues. |
| 31 | | | | | **Generation situation changes including a charging pause** |
| 32 | 0x0302 | Charging Current Energy Manager | Write | 6A | EMS writes a valid current to the wallbox. |
| 33 | 0xD05 | Charging Release Energy Manager | Write | 0 = charging is not allowed | EMS tells the wallbox to pause charging, the relays are opened. |
| 34 | 0x0302 | Charging Current Energy Manager | Write | 6A | EMS continues to write a charging current to the wallbox but the charging still pauses because charging release is not set.<br>EMS authorises the wallbox to charge. Charging is resumed with 6A with the same number of "Requested Phases". |
| 35 | 0xD05 | Charging Release Energy Manager | Write | 1 = charging is allowed | **The change between charging pause and charging resumption should be reduced as much as possible.**<br>**Recommendation: Continue charging at intervals of >5 minutes.** |

---

*21.03.2024*
