# app.py  —  Flask backend for Habit Tracker
# Deploy on Ubuntu at 192.168.10.211

from functools import wraps
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3, json, os

app = Flask(__name__,
    static_folder=os.path.join(os.path.dirname(__file__), "dist"),
    static_url_path=""
)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super_secret_peter1947_key")
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), "habit_tracker.db")
APP_PASSWORD = os.environ.get("APP_PASSWORD")

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

# ── Auth ───────────────────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    if data.get("password") == APP_PASSWORD:
        session["logged_in"] = True
        return jsonify({"ok": True})
    return jsonify({"error": "Invalid password"}), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    return jsonify({"logged_in": bool(session.get("logged_in"))})

# ── AI Chat Integration ────────────────────────────────────────────────────────
import urllib.request
import urllib.error

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    payload = request.get_json(force=True)
    messages = payload.get("messages", [])
    model = payload.get("model", "meta-llama/llama-3-8b-instruct:free")
    
    req_data = json.dumps({
        "model": model,
        "messages": messages
    }).encode("utf-8")
    
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=req_data)
    req.add_header("Authorization", f"Bearer {OPENROUTER_API_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("HTTP-Referer", "https://www.peter1947.space")
    req.add_header("X-Title", "Self Management Dashboard")
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return jsonify(result)
    except urllib.error.HTTPError as e:
        details = e.read().decode("utf-8")
        print(f"OpenRouter HTTP Error {e.code}: {details}")
        return jsonify({"error": str(e), "details": details}), 500

# ── Generic key/value API ──────────────────────────────────────────────────────

@app.route("/api/data/<key>", methods=["GET"])
@require_auth
def get_data(key):
    with get_db() as db:
        row = db.execute("SELECT value FROM store WHERE key=?", (key,)).fetchone()
    if row:
        return jsonify({"key": key, "value": json.loads(row["value"])})
    return jsonify({"key": key, "value": None})

@app.route("/api/data/<key>", methods=["POST"])
@require_auth
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
@require_auth
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