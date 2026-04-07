from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

# 🔥 NEW: Access Point table
class AccessPoint(Base):
    __tablename__ = "access_points"

    id = Column(String, primary_key=True)  # ap_id
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    last_seen = Column(DateTime, default=datetime.utcnow)


# 🔥 UPDATED: Device (removed lat/lng)
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True)
    mac = Column(String, unique=True, index=True)
    ap_id = Column(String)
    signal = Column(Float)
    last_seen = Column(DateTime, default=datetime.utcnow)