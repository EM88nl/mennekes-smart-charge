import ModbusRTU from 'modbus-serial';
import { ChargerState } from '../types';

export class ModbusClient {
  private client: ModbusRTU;
  private port: string;
  private baudRate: number;
  private slaveId: number;
  private connected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: string, baudRate: number, slaveId: number) {
    this.client = new ModbusRTU();
    this.port = port;
    this.baudRate = baudRate;
    this.slaveId = slaveId;
  }

  async connect(): Promise<void> {
    try {
      console.log(`Connecting to Modbus RTU on ${this.port}...`);

      await this.client.connectRTUBuffered(this.port, {
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 2,
        parity: 'none'
      });

      this.client.setID(this.slaveId);
      this.client.setTimeout(1000);
      this.connected = true;

      console.log('Connected to Modbus RTU');

      // Start heartbeat (every 5 seconds to be safe, spec says <10s)
      this.startHeartbeat();

    } catch (error) {
      console.error('Failed to connect to Modbus:', error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.writeHeartbeat();
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, 5000);
  }

  private async writeHeartbeat(): Promise<void> {
    // Write 0x55AA (21930) to register 0x0D00
    await this.client.writeRegister(0x0D00, 0x55AA);
  }

  async setChargingCurrent(current: number): Promise<void> {
    // Write float to registers 0x0302-0x0303
    // Convert current to buffer (IEEE 754 float, big endian)
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeFloatBE(current, 0);

    const registers = [
      buffer.readUInt16BE(0),
      buffer.readUInt16BE(2)
    ];

    await this.client.writeRegisters(0x0302, registers);
  }

  async setChargingRelease(enable: boolean): Promise<void> {
    // Write to register 0x0D05: 0 = not allowed, 1 = allowed
    await this.client.writeRegister(0x0D05, enable ? 1 : 0);
  }

  async readChargerState(): Promise<ChargerState> {
    // Read EVSE State (0x0100)
    const evseStateData = await this.client.readHoldingRegisters(0x0100, 1);
    const evseState = evseStateData.data[0];

    // Read Authorization Status (0x0101)
    const authStatusData = await this.client.readHoldingRegisters(0x0101, 1);
    const authStatus = authStatusData.data[0];

    // Read Power Overall (0x0512-0x0513, float)
    const powerData = await this.client.readHoldingRegisters(0x0512, 2);
    const chargingPower = this.readFloat(powerData.data);

    // Read Current L1, L2, L3 (floats)
    const currentL1Data = await this.client.readHoldingRegisters(0x0500, 2);
    const currentL1 = this.readFloat(currentL1Data.data);

    const currentL2Data = await this.client.readHoldingRegisters(0x0502, 2);
    const currentL2 = this.readFloat(currentL2Data.data);

    const currentL3Data = await this.client.readHoldingRegisters(0x0504, 2);
    const currentL3 = this.readFloat(currentL3Data.data);

    // Read Session Energy (0x0B02-0x0B03, float in Wh)
    const sessionEnergyData = await this.client.readHoldingRegisters(0x0B02, 2);
    const sessionEnergy = this.readFloat(sessionEnergyData.data);

    // Read Session Duration (0x0B04-0x0B05, uint32 in seconds)
    const sessionDurationData = await this.client.readHoldingRegisters(0x0B04, 2);
    const sessionDuration = this.readUInt32(sessionDurationData.data);

    return {
      evseState,
      authStatus,
      chargingPower,
      currentL1,
      currentL2,
      currentL3,
      sessionEnergy,
      sessionDuration
    };
  }

  private readFloat(registers: number[]): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(registers[0], 0);
    buffer.writeUInt16BE(registers[1], 2);
    return buffer.readFloatBE(0);
  }

  private readUInt32(registers: number[]): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(registers[0], 0);
    buffer.writeUInt16BE(registers[1], 2);
    return buffer.readUInt32BE(0);
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.connected) {
      this.client.close(() => {
        console.log('Disconnected from Modbus');
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
