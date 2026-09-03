# app.py  —  Flask backend for Habit Tracker
# Deploy on Ubuntu at 192.168.10.211

from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, json, os, stripe, secrets

# Configure Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

app = Flask(__name__,
    static_folder=os.path.join(os.path.dirname(__file__), "dist"),
    static_url_path="/dashboard/static"
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
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                courses TEXT NOT NULL,
                magic_token TEXT
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                course_id TEXT NOT NULL,
                stripe_session TEXT,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id)
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
    
    # Admin Login
    if data.get("password") == APP_PASSWORD:
        session["logged_in"] = True
        session["role"] = "admin"
        return jsonify({"ok": True, "role": "admin"})
        
    # Student Magic Token Login
    token = data.get("token")
    if token:
        with get_db() as db:
            user = db.execute("SELECT * FROM users WHERE magic_token=?", (token,)).fetchone()
            if user:
                session["logged_in"] = True
                session["role"] = "student"
                session["email"] = user["email"]
                session["courses"] = json.loads(user["courses"])
                return jsonify({"ok": True, "role": "student", "courses": session["courses"]})
                
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    return jsonify({
        "logged_in": bool(session.get("logged_in")),
        "role": session.get("role"),
        "email": session.get("email"),
        "courses": session.get("courses", [])
    })

# ── Student Auth ───────────────────────────────────────────────────────────────

@app.route("/api/student/signup", methods=["POST"])
def student_signup():
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    pwd_hash = generate_password_hash(password)
    
    try:
        with get_db() as db:
            cursor = db.execute("INSERT INTO students (email, password_hash, name) VALUES (?, ?, ?)", 
                                (email, pwd_hash, name))
            db.commit()
            student_id = cursor.lastrowid
            
        session["student_logged_in"] = True
        session["student_id"] = student_id
        session["student_email"] = email
        session["student_name"] = name
        
        return jsonify({"ok": True, "name": name, "email": email})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400

@app.route("/api/student/login", methods=["POST"])
def student_login():
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")
    
    with get_db() as db:
        student = db.execute("SELECT * FROM students WHERE email=?", (email,)).fetchone()
        
        if student and check_password_hash(student["password_hash"], password):
            # Get purchased courses
            purchases = db.execute("SELECT course_id FROM purchases WHERE student_id=?", (student["id"],)).fetchall()
            courses = [p["course_id"] for p in purchases]
            
            session["student_logged_in"] = True
            session["student_id"] = student["id"]
            session["student_email"] = student["email"]
            session["student_name"] = student["name"]
            
            return jsonify({"ok": True, "name": student["name"], "email": student["email"], "courses": courses})
            
    return jsonify({"error": "Invalid email or password"}), 401

@app.route("/api/student/logout", methods=["POST"])
def student_logout():
    session.pop("student_logged_in", None)
    session.pop("student_id", None)
    session.pop("student_email", None)
    session.pop("student_name", None)
    return jsonify({"ok": True})

@app.route("/api/student/status", methods=["GET"])
def student_status():
    if not session.get("student_logged_in"):
        return jsonify({"logged_in": False})
        
    with get_db() as db:
        purchases = db.execute("SELECT course_id FROM purchases WHERE student_id=?", (session["student_id"],)).fetchall()
        courses = [p["course_id"] for p in purchases]
        
    return jsonify({
        "logged_in": True,
        "name": session.get("student_name"),
        "email": session.get("student_email"),
        "courses": courses
    })

@app.route("/api/student/checkout", methods=["POST"])
def student_checkout():
    if not session.get("student_logged_in"):
        return jsonify({"error": "Must be logged in"}), 401
        
    if not stripe.api_key:
        return jsonify({"error": "Stripe is not configured"}), 500
        
    data = request.get_json(force=True)
    course_id = data.get("course_id")
    student_id = session.get("student_id")
    
    courses_dict = {
        "calisthenics": {"name": "Calisthenics Mastery", "price": 4900},
        "robotics": {"name": "Robotics Engineering", "price": 6900}
    }
    
    if course_id not in courses_dict:
        return jsonify({"error": "Invalid course"}), 400
        
    with get_db() as db:
        purchased = db.execute("SELECT id FROM purchases WHERE student_id=? AND course_id=?", (student_id, course_id)).fetchone()
        if purchased:
            return jsonify({"error": "Already purchased"}), 400
            
    try:
        base_url = f"https://{request.host}"
        stripe_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': courses_dict[course_id]['name'],
                    },
                    'unit_amount': courses_dict[course_id]['price'],
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{base_url}/academy/courses?success=true&course={course_id}",
            cancel_url=f"{base_url}/academy/courses",
            metadata={
                'course_id': course_id,
                'student_id': student_id
            }
        )
        return jsonify({'url': stripe_session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/auth/verify_nginx", methods=["GET", "POST", "OPTIONS"])
def auth_verify_nginx():
    if not session.get("logged_in"):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"ok": True}), 200

# ── AI Chat Integration ────────────────────────────────────────────────────────
import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig

@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    payload = request.get_json(force=True)
    messages = payload.get("messages", [])
    
    async def call_agy():
        config = LocalAgentConfig(
            system_instructions="You are Antigravity, integrated directly into Peter's web dashboard. You have the ability to run terminal commands inside the Docker container to assist the user. Keep answers concise unless asked to write code.",
            capabilities=CapabilitiesConfig()
        )
        async with Agent(config) as agent:
            # Format the conversation history for the stateless agent
            history = "\n".join([f"[{m.get('role', 'user').upper()}]: {m.get('content', '')}" for m in messages])
            prompt = f"Here is the conversation history. Please respond to the last USER message.\n\n{history}"
            
            response = await agent.chat(prompt)
            full_text = ""
            async for token in response:
                full_text += token
            return full_text

    try:
        reply_text = asyncio.run(call_agy())
        # Return in the exact format the React frontend expects
        return jsonify({
            "choices": [
                {
                    "message": {
                        "content": reply_text
                    }
                }
            ]
        })
    except Exception as e:
        print(f"AGY SDK Error: {str(e)}")
        return jsonify({"error": str(e), "details": str(e)}), 500

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

# ── Stripe Payments ────────────────────────────────────────────────────────────

@app.route("/api/create-checkout-session", methods=["POST"])
def create_checkout_session():
    if not stripe.api_key:
        return jsonify({"error": "Stripe is not configured on the server. Please add STRIPE_SECRET_KEY to your environment."}), 500
        
    data = request.get_json(force=True)
    course_id = data.get("course_id")
    
    courses = {
        "calisthenics": {"name": "Calisthenics Mastery", "price": 4900},
        "robotics": {"name": "Robotics Engineering", "price": 6900}
    }
    
    if course_id not in courses:
        return jsonify({"error": "Invalid course"}), 400
        
    course = courses[course_id]
    
    try:
        # Use https:// manually since we are behind Cloudflare
        base_url = f"https://{request.host}"
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': course['name'],
                    },
                    'unit_amount': course['price'],
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{base_url}/dashboard/?success=true&course={course_id}",
            cancel_url=f"{base_url}/",
            metadata={
                'course_id': course_id
            }
        )
        return jsonify({'url': session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 403

@app.route("/api/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get("Stripe-Signature")
    
    if not STRIPE_WEBHOOK_SECRET:
        return "Webhook secret not configured", 400
        
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        return "Invalid payload", 400
    except stripe.error.SignatureVerificationError as e:
        return "Invalid signature", 400
        
    if event['type'] == 'checkout.session.completed':
        session_obj = event['data']['object']
        course_id = session_obj['metadata'].get('course_id')
        student_id = session_obj['metadata'].get('student_id')
        stripe_session_id = session_obj.get('id')
        
        if student_id and course_id:
            with get_db() as db:
                db.execute("INSERT INTO purchases (student_id, course_id, stripe_session) VALUES (?, ?, ?)", 
                           (student_id, course_id, stripe_session_id))
                db.commit()
            print(f"[STRIPE] Payment successful! Student {student_id} bought {course_id}")
        
    return "Success", 200

@app.route("/api/admin/users", methods=["GET"])
@require_auth
def get_users():
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403
        
    with get_db() as db:
        users = db.execute("SELECT email, courses, magic_token FROM users").fetchall()
        
    return jsonify([dict(u) for u in users])

# ── Serve React frontend ───────────────────────────────────────────────────────

DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

@app.route("/dashboard/", defaults={"path": ""})
@app.route("/dashboard/<path:path>")
def serve_frontend(path):
    target = os.path.join(DIST_DIR, path)
    if path and os.path.exists(target):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")

# ── Serve Academy Pages ────────────────────────────────────────────────────────

ACADEMY_DIR = os.path.join(os.path.dirname(__file__), "..", "academy")

@app.route("/academy/", defaults={"path": "index.html"})
@app.route("/academy/<path:path>")
def serve_academy(path):
    # Map simple paths to their .html equivalents if needed
    if path == "courses":
        path = "courses.html"
    elif path.startswith("course/"):
        # e.g., course/calisthenics -> course_calisthenics.html
        parts = path.split("/")
        if len(parts) == 2:
            path = f"course_{parts[1]}.html"
            
    target = os.path.join(ACADEMY_DIR, path)
    if os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(ACADEMY_DIR, path)
    return send_from_directory(ACADEMY_DIR, "index.html")

# ── Serve Standby Page (Default Root) ─────────────────────────────────────────

STANDBY_DIR = os.path.join(os.path.dirname(__file__), "..", "standby_page")

@app.route("/", defaults={"path": "newtab.html"})
def serve_root(path):
    return send_from_directory(STANDBY_DIR, path)

@app.route("/<path:path>")
def serve_standby_assets(path):
    # This handles requests to /css/style.css, /js/app.js etc from the root
    if path.startswith(("api/", "dashboard/", "terminal/", "academy/", "storefront/")):
        return jsonify({"error": "Not found"}), 404
        
    target = os.path.join(STANDBY_DIR, path)
    if os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(STANDBY_DIR, path)
    
    # Fallback to newtab.html for unknown routes not matching prefixes
    return send_from_directory(STANDBY_DIR, "newtab.html")

# ── Serve Storefront ──────────────────────────────────────────────────────────

STOREFRONT_DIR = os.path.join(os.path.dirname(__file__), "..", "storefront")

@app.route("/storefront/", defaults={"path": "index.html"})
@app.route("/storefront/<path:path>")
def serve_storefront(path):
    target = os.path.join(STOREFRONT_DIR, path)
    if os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(STOREFRONT_DIR, path)
    return send_from_directory(STOREFRONT_DIR, "index.html")

# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5055, debug=False)