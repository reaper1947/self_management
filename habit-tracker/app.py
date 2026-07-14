# app.py  —  Flask backend for Habit Tracker
# Deploy on Ubuntu at 192.168.10.211

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, json, os

app = Flask(__name__,
    static_folder=os.path.join(os.path.dirname(__file__), "dist"),
    static_url_path=""
)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "habit_tracker.db")

# ── DB init ────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS store (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.commit()

# ── Generic key/value API ──────────────────────────────────────────────────────

@app.route("/api/data/<key>", methods=["GET"])
def get_data(key):
    with get_db() as db:
        row = db.execute("SELECT value FROM store WHERE key=?", (key,)).fetchone()
    if row:
        return jsonify({"key": key, "value": json.loads(row["value"])})
    return jsonify({"key": key, "value": None})

@app.route("/api/data/<key>", methods=["POST"])
def set_data(key):
    payload = request.get_json(force=True)
    value   = json.dumps(payload.get("value"))
    with get_db() as db:
        db.execute("""
            INSERT INTO store (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value      = excluded.value,
                updated_at = CURRENT_TIMESTAMP
        """, (key, value))
        db.commit()
    return jsonify({"ok": True})

@app.route("/api/data/<key>", methods=["DELETE"])
def del_data(key):
    with get_db() as db:
        db.execute("DELETE FROM store WHERE key=?", (key,))
        db.commit()
    return jsonify({"ok": True})

@app.route("/api/keys", methods=["GET"])
def list_keys():
    prefix = request.args.get("prefix", "")
    with get_db() as db:
        rows = db.execute(
            "SELECT key, updated_at FROM store WHERE key LIKE ?",
            (f"{prefix}%",)
        ).fetchall()
    return jsonify([{"key": r["key"], "updated_at": r["updated_at"]} for r in rows])

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

# ── Serve React frontend ───────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    target = os.path.join(app.static_folder, path)
    if path and os.path.exists(target):
        return app.send_static_file(path)
    return app.send_static_file("index.html")

# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5055, debug=False)