import minimalmodbus

class Charger:
    def __init__(self, port: str, slave_address: int = 50, baudrate: int = 57600, timeout: float = 1.0):
        self.instrument = minimalmodbus.Instrument(port, slave_address)
        self.instrument.serial.baudrate = baudrate
        self.instrument.serial.stopbits = 2
        self.instrument.serial.timeout = timeout

    def get_cp_state(self):
        return self.instrument.read_register(0x0108)