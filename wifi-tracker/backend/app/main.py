from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import SessionLocal, engine
from app.models import Device, AccessPoint, Base
from app.schemas import APReport

# 🔥 create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()


# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# AP REPORT (AUTO REGISTER)
# =========================
@app.post("/api/v1/ap/report")
def report_devices(data: APReport, db: Session = Depends(get_db)):

    # 🔥 AUTO REGISTER AP
    ap = db.query(AccessPoint).filter(AccessPoint.id == data.ap_id).first()

    if not ap:
        ap = AccessPoint(
            id=data.ap_id,
            name=data.ap_id,
            lat=data.lat,
            lng=data.lng,
            last_seen=datetime.utcnow()
        )
        db.add(ap)
    else:
        ap.lat = data.lat
        ap.lng = data.lng
        ap.last_seen = datetime.utcnow()

    # 🔥 HANDLE DEVICES
    for client in data.clients:
        device = db.query(Device).filter(Device.mac == client.mac).first()

        if device:
            device.ap_id = data.ap_id
            device.signal = client.signal
            device.last_seen = datetime.utcnow()
        else:
            device = Device(
                mac=client.mac,
                ap_id=data.ap_id,
                signal=client.signal,
                last_seen=datetime.utcnow()
            )
            db.add(device)

    db.commit()

    return {"status": "ok"}


# =========================
# MAP DATA
# =========================
@app.get("/api/map-data")
def get_map_data(db: Session = Depends(get_db)):

    aps = db.query(AccessPoint).all()
    devices = db.query(Device).all()

    grouped = {}

    # create AP structure
    for ap in aps:
        grouped[ap.id] = {
            "ap_name": ap.name,
            "lat": ap.lat,
            "lng": ap.lng,
            "devices": []
        }

    # attach devices
    for d in devices:
        if d.ap_id in grouped:
            grouped[d.ap_id]["devices"].append({
                "mac": d.mac,
                "signal": d.signal
            })

    return list(grouped.values())