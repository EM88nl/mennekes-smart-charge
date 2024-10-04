from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
import minimalmodbus

api = FastAPI()
charger = minimalmodbus.Instrument('/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0', 50)
charger.serial.baudrate = 57600
charger.serial.stopbits = 2
    

@api.get("/firmware/version")
def read_firmware_version():
    return {"firmware_version": charger.read_string(0x0001)}

@api.get("/status")
def read_status():
    status_map = {
        0: "Not initialized",
        1: "Idle",
        2: "Connected",
        3: "Pre-condition valid",
        4: "Ready to charge",
        5: "Charging",
        6: "Error",
        7: "Service mode"
    }
    return {"status": status_map[charger.read_register(0x0000)]}
