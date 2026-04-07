import time
import psycopg2

while True:
    try:
        conn = psycopg2.connect(
            host="db",
            database="wifi_tracker",
            user="wifi",
            password="wifi"
        )
        conn.close()
        print("✅ Database ready")
        break
    except Exception as e:
        print("⏳ Waiting for DB...")
        time.sleep(2)