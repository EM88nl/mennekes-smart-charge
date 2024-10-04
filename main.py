from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
import minimalmodbus

api = FastAPI()
charger = minimalmodbus.Instrument('/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0', 50)
charger.serial.baudrate = 57600
charger.serial.stopbits = 2


class ChargeSession(BaseModel):
    start_time: str
    end_time: str
    energy_delivered: float
    cost: float


@api.get("/firmware/version")
def read_firmware_version():
    return {"firmware_version": charger.read_string(0x0001)}
