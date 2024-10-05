import argparse
from fastapi import FastAPI
import uvicorn
from mennekes_smart_charge import charger

app = FastAPI()
charger = charger.Charger('/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0')

@app.get("/status")
def get_status():
    return charger.get_cp_state()

def main():
    parser = argparse.ArgumentParser(description="Mennekes Smart Charge API server.")
    parser.add_argument('--host', type=str, default="127.0.0.1", help="Host to run the API on")
    parser.add_argument('--port', type=int, default=8000, help="Port to run the API on")

    args = parser.parse_args()

    uvicorn.run("mennekes_smart_charge.main:app", host=args.host, port=args.port, reload=True)

if __name__ == "__main__":
    main()
