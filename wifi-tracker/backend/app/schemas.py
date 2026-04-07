from pydantic import BaseModel
from typing import List
from datetime import datetime

class ClientReport(BaseModel):
    mac: str
    signal: int
    rx_rate: float
    tx_rate: float


class APReport(BaseModel):
    ap_id: str
    lat: float     # 🔥 NEW
    lng: float     # 🔥 NEW
    timestamp: datetime
    clients: List[ClientReport]