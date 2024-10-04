from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
import minimalmodbus

api = FastAPI()
charger = minimalmodbus.Instrument('/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0', 50)
charger.serial.baudrate = 57600
charger.serial.stopbits = 2

class Information(BaseModel):
    firmware_version: str
    serial_number: str
    hardware_version: int
    product_id: int
    

@api.get("/information")
def read_information():
    return Information(
        firmware_version=charger.read_string(0x0001),
        serial_number=charger.read_string(0x0009),
        hardware_version=charger.read_register(0x0011),
        product_id=charger.read_register(0x0012)
    )

