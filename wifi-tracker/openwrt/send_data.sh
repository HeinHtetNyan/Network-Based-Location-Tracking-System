#!/bin/sh

AP_ID="office"
LAT="13.7563"
LNG="100.5018"

API_URL="http://YOUR_SERVER_IP/api/v1/ap/report"

RAW=$(iw dev wlan0 station dump)

DEVICES=$(echo "$RAW" | awk '
/Station/ {mac=$2}
/signal:/ {signal=$2}
/rx bitrate:/ {rx=$3}
/tx bitrate:/ {tx=$3; 
    printf "{\"mac\":\"%s\",\"signal\":%s,\"rx_rate\":%s,\"tx_rate\":%s},", mac, signal, rx, tx
}
')

JSON=$(printf '{
  "ap_id": "%s",
  "lat": %s,
  "lng": %s,
  "timestamp": "%s",
  "clients": [%s]
}' "$AP_ID" "$LAT" "$LNG" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$DEVICES" | sed 's/,]/]/')

curl -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "$JSON"