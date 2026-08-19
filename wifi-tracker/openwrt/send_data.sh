#!/bin/sh
#  NetTrack — OpenWrt AP Reporter
#  Collects connected Wi-Fi clients and reports them to the
#  NetTrack backend every few seconds.
#
#  HOW IT WORKS:
#    AP (this script) ──POST /api/v1/ap/report──► Backend ──► Database
#    Browser          ──GET  /api/map-data    ──► Backend ──► Map/Dashboard
#
#  QUICK DEPLOY:
#    scp send_data.sh root@<router-ip>:/usr/bin/send_data.sh
#    ssh root@<router-ip> "chmod +x /usr/bin/send_data.sh && /usr/bin/send_data.sh &"

# SECTION 1 — AP IDENTITY (change per access point)
# Each physical AP you deploy needs a unique AP_ID,
# and its own GPS coordinates.
AP_ID="AP-Office"    # Unique name shown on the map  (e.g. AP-Floor1, AP-Lobby)
LAT="13.7563"        # Latitude  of this AP's physical location
LNG="100.5018"       # Longitude of this AP's physical location
IFACE="wlan0"        # Wireless interface name  (run "iw dev" on the router to check)


# SECTION 2 — SERVER ADDRESS
#
# ▶ LOCAL / TESTING
#   Use your computer's LAN IP (must be on same network).
#   Find it with:  hostname -I | awk '{print $1}'
#   SERVER="192.168.31.238"
#
# ▶ VPS DEPLOYMENT
#   Replace with your VPS public IP or domain name.
#   SERVER="203.0.113.10"        ← VPS public IP
#   SERVER="nettrack.example.com" ← domain (if DNS set up)
#
# NOTE: Vercel only hosts static frontends.
#       The backend (FastAPI + PostgreSQL) must run on a VPS
#       (e.g. DigitalOcean, Linode, AWS EC2).
#       On VPS, run:  docker compose up -d
#       Make sure port 80 is open in the VPS firewall.
SERVER="192.168.31.238"   # ← CHANGE THIS when deploying

API_URL="http://${SERVER}/api/v1/ap/report"

# SECTION 3 — REPORTING SETTINGS
INTERVAL=5   # Seconds between each report (keep ≥ 3 to match frontend poll)


#  Internal logic — no need to edit below this line

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

build_json() {
    RAW=$(iw dev "$IFACE" station dump 2>/dev/null)

    if [ -z "$RAW" ]; then
        CLIENTS="[]"
    else
        CLIENTS=$(echo "$RAW" | awk '
        /^Station / {
            mac = $2; signal = ""; rx = "0"; tx = "0"
        }
        /signal:/ && signal == "" {
            signal = $2
        }
        /rx bitrate:/ {
            rx = $3
        }
        /tx bitrate:/ {
            tx = $3
            if (mac != "" && signal != "") {
                if (count > 0) printf ","
                printf "{\"mac\":\"%s\",\"signal\":%s,\"rx_rate\":%s,\"tx_rate\":%s}", mac, signal, rx, tx
                count++
            }
        }
        ')
        CLIENTS="[${CLIENTS}]"
    fi

    printf '{"ap_id":"%s","lat":%s,"lng":%s,"timestamp":"%s","clients":%s}' \
        "$AP_ID" "$LAT" "$LNG" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$CLIENTS"
}

send_report() {
    JSON=$(build_json)
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$JSON" \
        --connect-timeout 5 \
        --max-time 10)

    if [ "$RESPONSE" = "200" ]; then
        COUNT=$(echo "$JSON" | grep -o '"mac"' | wc -l | tr -d ' ')
        log "OK — ${COUNT} device(s) reported  [${AP_ID} → ${SERVER}]"
    else
        log "FAIL — HTTP ${RESPONSE}  [${AP_ID} → ${API_URL}]"
        log "      Check: is the server running? Is port 80 open?"
    fi
}

# Entry point
# Pass --once to send a single report and exit  (useful for cron)
# No arguments = loop forever                   (useful as a service)
#
# CRON SETUP (LuCI → System → Scheduled Tasks):
#   * * * * * /usr/bin/send_data.sh --once >> /var/log/nettrack.log 2>&1
if [ "$1" = "--once" ]; then
    send_report
    exit 0
fi

log "NetTrack started — AP_ID=${AP_ID}  iface=${IFACE}  server=${SERVER}"
log "Sending reports every ${INTERVAL}s.  Press Ctrl+C to stop."
while true; do
    send_report
    sleep "$INTERVAL"
done
