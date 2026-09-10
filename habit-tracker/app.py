# app.py  —  Flask backend for Habit Tracker
# Deploy on Ubuntu at 192.168.10.211

from functools import wraps
from flask import (
    Flask, request, jsonify, session, send_from_directory,
    send_file, redirect, abort, Response,
)
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3, json, os, secrets, uuid

# Stripe is optional (legacy — payments now go through Buy Me a Coffee).
try:
    import stripe
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
except Exception:
    stripe = None
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

from lms_progress import compute_xp, level_for, streak_days
from lms_seed import seed_courses, build_guide, SEED_DIR
from md_render import render_markdown

app = Flask(__name__,
    static_folder=os.path.join(os.path.dirname(__file__), "dist"),
    static_url_path="/dashboard/static"
)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super_secret_peter1947_key")
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024 * 1024  # 256 MB uploads
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), "habit_tracker.db")
APP_PASSWORD = os.environ.get("APP_PASSWORD")

# Uploaded videos / documents live here (volume-mounted in production).
MEDIA_DIR = os.environ.get("MEDIA_DIR", os.path.join(os.path.dirname(__file__), "..", "media"))
os.makedirs(MEDIA_DIR, exist_ok=True)

# Buy Me a Coffee — Peter creates one paid "Extra" per course and pastes the real
# URL into each course from the admin panel; this is only the fallback base.
BMC_USERNAME = os.environ.get("BMC_USERNAME", "peter1947")
BMC_BASE = f"https://buymeacoffee.com/{BMC_USERNAME}"

# ── DB init ────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _add_column_if_missing(db, table, column, decl):
    cols = [r["name"] for r in db.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")

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

        # ── LMS schema ──────────────────────────────────────────────────────
        db.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id           TEXT PRIMARY KEY,
                title        TEXT NOT NULL,
                subtitle     TEXT DEFAULT '',
                description  TEXT DEFAULT '',
                hero         TEXT DEFAULT '',
                accent       TEXT DEFAULT 'cal',
                price_label  TEXT DEFAULT '',
                bmc_url      TEXT DEFAULT '',
                access_mode  TEXT DEFAULT 'paid',
                published    INTEGER DEFAULT 1,
                sort         INTEGER DEFAULT 100,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS modules (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id  TEXT NOT NULL,
                title      TEXT NOT NULL,
                summary    TEXT DEFAULT '',
                category   TEXT,
                sort       INTEGER DEFAULT 0,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS lessons (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                module_id    INTEGER NOT NULL,
                course_id    TEXT NOT NULL,
                title        TEXT NOT NULL,
                slug         TEXT NOT NULL,
                kind         TEXT DEFAULT 'reading',
                duration_min INTEGER DEFAULT 0,
                video_url    TEXT DEFAULT '',
                video_file   TEXT DEFAULT '',
                body_md      TEXT DEFAULT '',
                body_html    TEXT DEFAULT '',
                is_free      INTEGER DEFAULT 0,
                published    INTEGER DEFAULT 1,
                sort         INTEGER DEFAULT 0,
                updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
            )
        """)
        db.execute("CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_slug ON lessons(course_id, slug)")
        db.execute("""
            CREATE TABLE IF NOT EXISTS resources (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                lesson_id   INTEGER,
                course_id   TEXT NOT NULL,
                title       TEXT NOT NULL,
                kind        TEXT DEFAULT 'link',
                url         TEXT DEFAULT '',
                file_path   TEXT DEFAULT '',
                size_bytes  INTEGER DEFAULT 0,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS lesson_progress (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id   INTEGER NOT NULL,
                lesson_id    INTEGER NOT NULL,
                completed    INTEGER DEFAULT 0,
                completed_at DATETIME,
                seconds      INTEGER DEFAULT 0,
                UNIQUE(student_id, lesson_id)
            )
        """)

        _add_column_if_missing(db, "students", "bio", "TEXT DEFAULT ''")
        _add_column_if_missing(db, "students", "avatar_emoji", "TEXT DEFAULT '🐈'")
        _add_column_if_missing(db, "students", "goal", "TEXT DEFAULT ''")
        _add_column_if_missing(db, "purchases", "source", "TEXT DEFAULT 'stripe'")
        _add_column_if_missing(db, "purchases", "note", "TEXT DEFAULT ''")
        db.commit()

        try:
            summary = seed_courses(db)
            if summary:
                print(f"[LMS] seed: {summary}")
        except Exception as e:  # never block startup on seed problems
            print(f"[LMS] seed skipped: {e}")

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

    if stripe is None or not stripe.api_key:
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
try:
    from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
    _AGY_OK = True
except Exception:
    Agent = LocalAgentConfig = CapabilitiesConfig = None
    _AGY_OK = False

@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    if not _AGY_OK:
        return jsonify({"error": "AI chat is not available on this server"}), 503
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
    if stripe is None or not stripe.api_key:
        return jsonify({"error": "Stripe is not configured on the server. Please add STRIPE_SECRET_KEY to your environment."}), 500
        
    data = request.get_json(force=True)
    course_id = data.get("course_id")

    courses = {
        "calisthenics": {"name": "Calisthenics Mastery", "price": 4900},
        "robotics": {"name": "Robotics Engineering", "price": 6900},
        "bundle": {"name": "Calisthenics + Robotics Bundle", "price": 9900}
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

    if stripe is None:
        return "Stripe not available", 400
    if not STRIPE_WEBHOOK_SECRET:
        return "Webhook secret not configured", 400

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return "Invalid payload", 400
    except stripe.error.SignatureVerificationError:
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

# ══ LMS — Peter1947 Academy ═══════════════════════════════════════════════════

def _student_id():
    return session.get("student_id") if session.get("student_logged_in") else None

def _require_student():
    sid = _student_id()
    if not sid:
        abort(401)
    return sid

def _is_admin():
    return bool(session.get("logged_in") and session.get("role") == "admin")

def _require_admin():
    if not _is_admin():
        abort(403)

def _owns_course(db, student_id, course_id):
    c = db.execute("SELECT access_mode FROM courses WHERE id=?", (course_id,)).fetchone()
    if c and c["access_mode"] == "free":
        return True
    if not student_id:
        return False
    return bool(db.execute(
        "SELECT 1 FROM purchases WHERE student_id=? AND course_id=? LIMIT 1",
        (student_id, course_id)).fetchone())

def _course_module_lessons(db, course_id):
    """Ordered [[lesson_id, ...] per module] — for XP math."""
    mods = db.execute(
        "SELECT id FROM modules WHERE course_id=? ORDER BY sort, id", (course_id,)
    ).fetchall()
    out = []
    for m in mods:
        ls = db.execute(
            "SELECT id FROM lessons WHERE module_id=? AND published=1 ORDER BY sort, id",
            (m["id"],),
        ).fetchall()
        out.append([l["id"] for l in ls])
    return out

def _completed_ids(db, student_id, course_id=None):
    if course_id:
        rows = db.execute(
            """SELECT lp.lesson_id FROM lesson_progress lp
               JOIN lessons l ON l.id = lp.lesson_id
               WHERE lp.student_id=? AND lp.completed=1 AND l.course_id=?""",
            (student_id, course_id),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT lesson_id FROM lesson_progress WHERE student_id=? AND completed=1",
            (student_id,),
        ).fetchall()
    return {r["lesson_id"] for r in rows}

def _flat_lessons(db, course_id):
    """Ordered list of published lesson rows across the whole course."""
    return db.execute(
        """SELECT l.* FROM lessons l JOIN modules m ON m.id = l.module_id
           WHERE l.course_id=? AND l.published=1
           ORDER BY m.sort, m.id, l.sort, l.id""",
        (course_id,),
    ).fetchall()

def _video_info(lesson_id, video_url, video_file):
    import re as _re
    if video_file:
        return {"type": "file", "src": f"/api/lms/media/{lesson_id}/video"}
    u = (video_url or "").strip()
    if not u:
        return {"type": None}
    m = _re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([\w-]{6,})", u)
    if m:
        return {"type": "embed", "embed_url": f"https://www.youtube.com/embed/{m.group(1)}"}
    m = _re.search(r"vimeo\.com/(?:video/)?(\d+)", u)
    if m:
        return {"type": "embed", "embed_url": f"https://player.vimeo.com/video/{m.group(1)}"}
    if _re.search(r"\.(mp4|webm|ogg|mov|m4v)(\?|$)", u, _re.I):
        return {"type": "direct", "src": u}
    return {"type": "link", "src": u}

def _course_progress(db, student_id, course_id):
    mids = _course_module_lessons(db, course_id)
    flat = [lid for m in mids for lid in m]
    done = _completed_ids(db, student_id, course_id) if student_id else set()
    pct = round(100 * len([x for x in flat if x in done]) / len(flat)) if flat else 0
    return flat, done, pct


@app.route("/api/lms/me", methods=["GET"])
def lms_me():
    sid = _require_student()
    with get_db() as db:
        st = db.execute("SELECT * FROM students WHERE id=?", (sid,)).fetchone()
        if not st:
            abort(404)
        courses = db.execute(
            "SELECT * FROM courses WHERE published=1 ORDER BY sort, id"
        ).fetchall()
        all_done = _completed_ids(db, sid)
        drows = db.execute(
            """SELECT DISTINCT date(completed_at) d FROM lesson_progress
               WHERE student_id=? AND completed=1 AND completed_at IS NOT NULL""",
            (sid,),
        ).fetchall()
        streak = streak_days([r["d"] for r in drows])

        total_xp, total_done, per_course = 0, 0, []
        for c in courses:
            mids = _course_module_lessons(db, c["id"])
            flat = [lid for m in mids for lid in m]
            b = compute_xp(mids, all_done)
            total_xp += b["xp"]
            total_done += b["lessons_completed"]
            done_here = [x for x in flat if x in all_done]
            nxt = next((x for x in flat if x not in all_done), (flat[0] if flat else None))
            per_course.append({
                "id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
                "accent": c["accent"], "access_mode": c["access_mode"],
                "price_label": c["price_label"],
                "owned": _owns_course(db, sid, c["id"]),
                "progress_pct": round(100 * len(done_here) / len(flat)) if flat else 0,
                "lessons_total": len(flat), "lessons_done": len(done_here),
                "next_lesson_id": nxt,
                "bmc_url": c["bmc_url"] or BMC_BASE,
            })

        level, title, into, to_next = level_for(total_xp)
        return jsonify({
            "name": st["name"], "email": st["email"],
            "bio": st["bio"] or "", "avatar_emoji": st["avatar_emoji"] or "🐈",
            "goal": st["goal"] or "", "joined": st["created_at"],
            "xp": total_xp, "level": level, "level_title": title,
            "xp_into_level": into, "xp_to_next": to_next,
            "streak_days": streak, "lessons_completed": total_done,
            "courses": per_course,
        })


@app.route("/api/lms/me", methods=["POST"])
def lms_me_update():
    sid = _require_student()
    data = request.get_json(force=True) or {}
    bio = (data.get("bio") or "")[:280]
    goal = (data.get("goal") or "")[:120]
    emoji = (data.get("avatar_emoji") or "🐈")[:8]
    with get_db() as db:
        db.execute("UPDATE students SET bio=?, goal=?, avatar_emoji=? WHERE id=?",
                   (bio, goal, emoji, sid))
        db.commit()
    return jsonify({"ok": True})


@app.route("/api/lms/courses", methods=["GET"])
def lms_courses():
    sid = _student_id()
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM courses WHERE published=1 ORDER BY sort, id"
        ).fetchall()
        out = []
        for c in rows:
            _flat, _done, pct = _course_progress(db, sid, c["id"])
            out.append({
                "id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
                "description": c["description"], "accent": c["accent"],
                "price_label": c["price_label"], "access_mode": c["access_mode"],
                "bmc_url": c["bmc_url"] or BMC_BASE,
                "owned": _owns_course(db, sid, c["id"]),
                "progress_pct": pct, "lessons_total": len(_flat),
            })
    return jsonify(out)


@app.route("/api/lms/course/<course_id>", methods=["GET"])
def lms_course(course_id):
    sid = _student_id()
    with get_db() as db:
        c = db.execute("SELECT * FROM courses WHERE id=? AND published=1", (course_id,)).fetchone()
        if not c:
            abort(404)
        owned = _owns_course(db, sid, course_id)
        done = _completed_ids(db, sid, course_id) if sid else set()
        mods = db.execute(
            "SELECT * FROM modules WHERE course_id=? ORDER BY sort, id", (course_id,)
        ).fetchall()
        modules = []
        total = complete = 0
        for m in mods:
            ls = db.execute(
                "SELECT * FROM lessons WHERE module_id=? AND published=1 ORDER BY sort, id",
                (m["id"],),
            ).fetchall()
            lessons = []
            for l in ls:
                total += 1
                is_done = l["id"] in done
                if is_done:
                    complete += 1
                lessons.append({
                    "id": l["id"], "title": l["title"], "kind": l["kind"],
                    "duration_min": l["duration_min"], "is_free": bool(l["is_free"]),
                    "completed": is_done,
                    "locked": not (owned or l["is_free"]),
                })
            modules.append({
                "id": m["id"], "title": m["title"], "summary": m["summary"],
                "category": m["category"], "lessons": lessons,
            })
        return jsonify({
            "id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
            "description": c["description"], "accent": c["accent"],
            "price_label": c["price_label"], "access_mode": c["access_mode"],
            "bmc_url": c["bmc_url"] or BMC_BASE, "owned": owned,
            "progress_pct": round(100 * complete / total) if total else 0,
            "lessons_total": total, "lessons_done": complete,
            "modules": modules,
        })


@app.route("/api/lms/lesson/<int:lesson_id>", methods=["GET"])
def lms_lesson(lesson_id):
    sid = _student_id()
    with get_db() as db:
        l = db.execute("SELECT * FROM lessons WHERE id=? AND published=1", (lesson_id,)).fetchone()
        if not l:
            abort(404)
        c = db.execute("SELECT * FROM courses WHERE id=?", (l["course_id"],)).fetchone()
        m = db.execute("SELECT * FROM modules WHERE id=?", (l["module_id"],)).fetchone()
        owned = _owns_course(db, sid, l["course_id"])
        if not (owned or l["is_free"]):
            return jsonify({
                "locked": True, "title": l["title"],
                "course": {"id": c["id"], "title": c["title"], "accent": c["accent"]},
                "bmc_url": c["bmc_url"] or BMC_BASE,
                "price_label": c["price_label"],
            }), 403

        flat = _flat_lessons(db, l["course_id"])
        ids = [x["id"] for x in flat]
        i = ids.index(lesson_id) if lesson_id in ids else -1
        prev_id = ids[i - 1] if i > 0 else None
        next_id = ids[i + 1] if 0 <= i < len(ids) - 1 else None

        done = _completed_ids(db, sid, l["course_id"]) if sid else set()
        res = db.execute(
            """SELECT id, title, kind, url, file_path, size_bytes FROM resources
               WHERE lesson_id=? OR (course_id=? AND lesson_id IS NULL)
               ORDER BY lesson_id IS NULL, id""",
            (lesson_id, l["course_id"]),
        ).fetchall()
        resources = [{
            "id": r["id"], "title": r["title"], "kind": r["kind"],
            "size_bytes": r["size_bytes"],
            "download_url": f"/api/lms/resource/{r['id']}",
        } for r in res]

        return jsonify({
            "id": l["id"], "title": l["title"], "kind": l["kind"],
            "duration_min": l["duration_min"], "body_html": l["body_html"],
            "is_free": bool(l["is_free"]),
            "video": _video_info(l["id"], l["video_url"], l["video_file"]),
            "completed": lesson_id in done,
            "resources": resources,
            "guide_url": f"/api/lms/course/{l['course_id']}/guide.md" if owned else None,
            "module": {"id": m["id"], "title": m["title"]},
            "course": {"id": c["id"], "title": c["title"], "accent": c["accent"],
                       "progress_pct": _course_progress(db, sid, c["id"])[2]},
            "prev_id": prev_id, "next_id": next_id,
            "position": (i + 1, len(ids)),
        })


@app.route("/api/lms/lesson/<int:lesson_id>/complete", methods=["POST"])
def lms_lesson_complete(lesson_id):
    sid = _require_student()
    want = (request.get_json(silent=True) or {}).get("completed", True)
    with get_db() as db:
        l = db.execute("SELECT * FROM lessons WHERE id=? AND published=1", (lesson_id,)).fetchone()
        if not l:
            abort(404)
        if not (_owns_course(db, sid, l["course_id"]) or l["is_free"]):
            abort(403)
        all_courses = [c["id"] for c in db.execute("SELECT id FROM courses").fetchall()]

        def total_xp(done):
            return sum(compute_xp(_course_module_lessons(db, cid), done)["xp"]
                       for cid in all_courses)

        xp_before = total_xp(_completed_ids(db, sid))
        if want:
            db.execute(
                """INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at)
                   VALUES (?,?,1,CURRENT_TIMESTAMP)
                   ON CONFLICT(student_id, lesson_id)
                   DO UPDATE SET completed=1, completed_at=COALESCE(completed_at, CURRENT_TIMESTAMP)""",
                (sid, lesson_id),
            )
        else:
            db.execute(
                "UPDATE lesson_progress SET completed=0 WHERE student_id=? AND lesson_id=?",
                (sid, lesson_id),
            )
        db.commit()

        xp_after = total_xp(_completed_ids(db, sid))
        level, title, into, to_next = level_for(xp_after)
        return jsonify({
            "ok": True, "completed": bool(want),
            "xp": xp_after, "level": level, "level_title": title,
            "xp_into_level": into, "xp_to_next": to_next,
            "level_up": level_for(xp_after)[0] > level_for(xp_before)[0],
            "course_progress_pct": _course_progress(db, sid, l["course_id"])[2],
        })


@app.route("/api/lms/lesson/<int:lesson_id>/progress", methods=["POST"])
def lms_lesson_progress(lesson_id):
    sid = _require_student()
    seconds = int((request.get_json(silent=True) or {}).get("seconds", 0) or 0)
    with get_db() as db:
        db.execute(
            """INSERT INTO lesson_progress (student_id, lesson_id, seconds)
               VALUES (?,?,?)
               ON CONFLICT(student_id, lesson_id)
               DO UPDATE SET seconds=MAX(seconds, excluded.seconds)""",
            (sid, lesson_id, seconds),
        )
        db.commit()
    return jsonify({"ok": True})


@app.route("/api/lms/media/<int:lesson_id>/video", methods=["GET"])
def lms_lesson_video(lesson_id):
    sid = _student_id()
    with get_db() as db:
        l = db.execute("SELECT * FROM lessons WHERE id=?", (lesson_id,)).fetchone()
        if not l:
            abort(404)
        if not (_owns_course(db, sid, l["course_id"]) or l["is_free"]):
            abort(403)
    if l["video_file"]:
        path = _media_path(l["video_file"])
        if not os.path.isfile(path):
            abort(404)
        return send_file(path, conditional=True)
    if l["video_url"]:
        return redirect(l["video_url"])
    abort(404)


@app.route("/api/lms/resource/<int:res_id>", methods=["GET"])
def lms_resource(res_id):
    sid = _student_id()
    with get_db() as db:
        r = db.execute("SELECT * FROM resources WHERE id=?", (res_id,)).fetchone()
        if not r:
            abort(404)
        free_ok = False
        if r["lesson_id"]:
            lf = db.execute("SELECT is_free FROM lessons WHERE id=?", (r["lesson_id"],)).fetchone()
            free_ok = bool(lf and lf["is_free"])
        if not (_owns_course(db, sid, r["course_id"]) or free_ok):
            abort(403)
    if r["url"]:
        return redirect(r["url"])
    if r["file_path"]:
        path = _media_path(r["file_path"])
        if not os.path.isfile(path):
            abort(404)
        return send_file(path, as_attachment=True)
    abort(404)


@app.route("/api/lms/course/<course_id>/guide.<ext>", methods=["GET"])
def lms_course_guide(course_id, ext):
    sid = _student_id()
    with get_db() as db:
        if not _owns_course(db, sid, course_id):
            abort(403)
        content, mime = build_guide(db, course_id, "md" if ext == "md" else "html")
    if content is None:
        abort(404)
    fname = f"{course_id}-guide.{ 'md' if ext == 'md' else 'html' }"
    return Response(content, mimetype=mime,
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@app.route("/api/lms/checkout/<course_id>", methods=["GET", "POST"])
def lms_checkout(course_id):
    with get_db() as db:
        c = db.execute("SELECT bmc_url FROM courses WHERE id=?", (course_id,)).fetchone()
    return jsonify({"bmc_url": (c["bmc_url"] if c and c["bmc_url"] else BMC_BASE)})


# ── LMS admin ────────────────────────────────────────────────────────────────

def _media_path(rel):
    """Resolve a stored relative media path, refusing anything outside MEDIA_DIR."""
    base = os.path.realpath(MEDIA_DIR)
    full = os.path.realpath(os.path.join(base, rel or ""))
    if full != base and not full.startswith(base + os.sep):
        abort(400)
    return full


def _save_upload(file_storage, course_id="misc"):
    name = secure_filename(file_storage.filename or "file")
    ext = os.path.splitext(name)[1].lower()
    rel = os.path.join(secure_filename(course_id or "misc"),
                       f"{uuid.uuid4().hex[:12]}{ext}")
    dest = os.path.join(MEDIA_DIR, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    file_storage.save(dest)
    return rel, os.path.getsize(dest)


@app.route("/api/admin/lms/overview", methods=["GET"])
def admin_lms_overview():
    _require_admin()
    with get_db() as db:
        g = lambda q, *a: db.execute(q, a).fetchone()[0]
        students = g("SELECT COUNT(*) FROM students")
        active_7d = g("""SELECT COUNT(DISTINCT student_id) FROM lesson_progress
                         WHERE completed_at >= datetime('now','-7 days')""")
        n_courses = g("SELECT COUNT(*) FROM courses")
        n_lessons = g("SELECT COUNT(*) FROM lessons WHERE published=1")
        completions = g("SELECT COUNT(*) FROM lesson_progress WHERE completed=1")
        completions_7d = g("""SELECT COUNT(*) FROM lesson_progress
                              WHERE completed=1 AND completed_at >= datetime('now','-7 days')""")
        grants = g("SELECT COUNT(*) FROM purchases")
        recent_signups = [dict(r) for r in db.execute(
            "SELECT id, name, email, created_at FROM students ORDER BY id DESC LIMIT 8")]
        recent_completions = [dict(r) for r in db.execute(
            """SELECT s.name, s.email, l.title AS lesson, l.course_id, lp.completed_at
               FROM lesson_progress lp
               JOIN students s ON s.id = lp.student_id
               JOIN lessons  l ON l.id = lp.lesson_id
               WHERE lp.completed=1 AND lp.completed_at IS NOT NULL
               ORDER BY lp.completed_at DESC LIMIT 12""")]
        per_course = []
        for c in db.execute("SELECT * FROM courses ORDER BY sort, id"):
            mids = _course_module_lessons(db, c["id"])
            flat = [x for mm in mids for x in mm]
            enrolled = g("SELECT COUNT(*) FROM purchases WHERE course_id=?", c["id"])
            prows = db.execute(
                """SELECT student_id, COUNT(*) n FROM lesson_progress lp
                   JOIN lessons l ON l.id = lp.lesson_id
                   WHERE l.course_id=? AND lp.completed=1 GROUP BY student_id""",
                (c["id"],)).fetchall()
            avg = round(sum(min(1.0, p["n"] / len(flat)) for p in prows) / len(prows) * 100) if prows and flat else 0
            finished = sum(1 for p in prows if flat and p["n"] >= len(flat))
            per_course.append({
                "id": c["id"], "title": c["title"], "published": bool(c["published"]),
                "lessons": len(flat), "enrolled": enrolled,
                "avg_progress": avg, "finished": finished,
            })
        return jsonify({
            "students": students, "active_7d": active_7d, "courses": n_courses,
            "lessons": n_lessons, "completions": completions,
            "completions_7d": completions_7d, "grants": grants,
            "recent_signups": recent_signups, "recent_completions": recent_completions,
            "per_course": per_course,
        })


@app.route("/api/admin/lms/students", methods=["GET"])
def admin_lms_students():
    _require_admin()
    with get_db() as db:
        out = []
        courses = db.execute("SELECT id FROM courses").fetchall()
        for s in db.execute("SELECT * FROM students ORDER BY id DESC"):
            all_done = _completed_ids(db, s["id"])
            xp = sum(compute_xp(_course_module_lessons(db, c["id"]), all_done)["xp"]
                     for c in courses)
            owned = [r["course_id"] for r in db.execute(
                "SELECT course_id FROM purchases WHERE student_id=?", (s["id"],))]
            lvl = level_for(xp)
            out.append({
                "id": s["id"], "name": s["name"], "email": s["email"],
                "joined": s["created_at"], "xp": xp, "level": lvl[0],
                "level_title": lvl[1], "lessons_completed": len(all_done),
                "courses": owned,
            })
    return jsonify(out)


@app.route("/api/admin/lms/grant", methods=["POST"])
def admin_lms_grant():
    _require_admin()
    d = request.get_json(force=True) or {}
    email = (d.get("email") or "").strip().lower()
    course_id = d.get("course_id")
    source = d.get("source") or "bmc"
    with get_db() as db:
        if not db.execute("SELECT 1 FROM courses WHERE id=?", (course_id,)).fetchone():
            return jsonify({"error": "Unknown course"}), 400
        st = db.execute("SELECT id FROM students WHERE lower(email)=?", (email,)).fetchone()
        if not st:
            return jsonify({"error": "No student with that email — they must create an account first."}), 404
        if db.execute("SELECT 1 FROM purchases WHERE student_id=? AND course_id=?",
                      (st["id"], course_id)).fetchone():
            return jsonify({"ok": True, "already": True})
        db.execute(
            "INSERT INTO purchases (student_id, course_id, stripe_session, source, note) VALUES (?,?,?,?,?)",
            (st["id"], course_id, f"{source}:{email}", source, d.get("note", "")),
        )
        db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/revoke", methods=["POST"])
def admin_lms_revoke():
    _require_admin()
    d = request.get_json(force=True) or {}
    email = (d.get("email") or "").strip().lower()
    with get_db() as db:
        st = db.execute("SELECT id FROM students WHERE lower(email)=?", (email,)).fetchone()
        if not st:
            return jsonify({"error": "No such student"}), 404
        db.execute("DELETE FROM purchases WHERE student_id=? AND course_id=?",
                   (st["id"], d.get("course_id")))
        db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/courses", methods=["GET", "POST"])
def admin_lms_courses():
    _require_admin()
    with get_db() as db:
        if request.method == "GET":
            out = []
            for c in db.execute("SELECT * FROM courses ORDER BY sort, id"):
                mods = db.execute(
                    "SELECT * FROM modules WHERE course_id=? ORDER BY sort, id", (c["id"],)
                ).fetchall()
                out.append({
                    **dict(c),
                    "modules": [{
                        **dict(m),
                        "lessons": [dict(l) for l in db.execute(
                            "SELECT id,title,slug,kind,duration_min,is_free,published,sort,video_url,video_file FROM lessons WHERE module_id=? ORDER BY sort,id",
                            (m["id"],))],
                    } for m in mods],
                })
            return jsonify(out)
        d = request.get_json(force=True) or {}
        cid = (d.get("id") or "").strip().lower().replace(" ", "-")
        if not cid or not d.get("title"):
            return jsonify({"error": "id and title required"}), 400
        db.execute(
            """INSERT INTO courses (id,title,subtitle,description,accent,price_label,bmc_url,access_mode,published,sort)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET title=excluded.title""",
            (cid, d["title"], d.get("subtitle", ""), d.get("description", ""),
             d.get("accent", "cal"), d.get("price_label", ""), d.get("bmc_url", ""),
             d.get("access_mode", "paid"), int(d.get("published", 1)), int(d.get("sort", 100))),
        )
        db.commit()
    return jsonify({"ok": True, "id": cid})


@app.route("/api/admin/lms/courses/<course_id>", methods=["PATCH", "DELETE"])
def admin_lms_course(course_id):
    _require_admin()
    with get_db() as db:
        if request.method == "DELETE":
            db.execute("DELETE FROM lessons WHERE course_id=?", (course_id,))
            db.execute("DELETE FROM modules WHERE course_id=?", (course_id,))
            db.execute("DELETE FROM resources WHERE course_id=?", (course_id,))
            db.execute("DELETE FROM courses WHERE id=?", (course_id,))
            db.commit()
            return jsonify({"ok": True})
        d = request.get_json(force=True) or {}
        fields = [k for k in ("title", "subtitle", "description", "accent", "price_label",
                              "bmc_url", "access_mode", "published", "sort") if k in d]
        if fields:
            db.execute(f"UPDATE courses SET {', '.join(k + '=?' for k in fields)} WHERE id=?",
                       (*[d[k] for k in fields], course_id))
            db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/modules", methods=["POST"])
def admin_lms_module_create():
    _require_admin()
    d = request.get_json(force=True) or {}
    with get_db() as db:
        n = db.execute("SELECT COALESCE(MAX(sort),-1)+1 s FROM modules WHERE course_id=?",
                       (d["course_id"],)).fetchone()["s"]
        cur = db.execute(
            "INSERT INTO modules (course_id,title,summary,category,sort) VALUES (?,?,?,?,?)",
            (d["course_id"], d.get("title", "New module"), d.get("summary", ""),
             d.get("category"), d.get("sort", n)),
        )
        db.commit()
        return jsonify({"ok": True, "id": cur.lastrowid})


@app.route("/api/admin/lms/modules/<int:mid>", methods=["PATCH", "DELETE"])
def admin_lms_module(mid):
    _require_admin()
    with get_db() as db:
        if request.method == "DELETE":
            db.execute("DELETE FROM lessons WHERE module_id=?", (mid,))
            db.execute("DELETE FROM modules WHERE id=?", (mid,))
            db.commit()
            return jsonify({"ok": True})
        d = request.get_json(force=True) or {}
        fields = [k for k in ("title", "summary", "category", "sort") if k in d]
        if fields:
            db.execute(f"UPDATE modules SET {', '.join(k + '=?' for k in fields)} WHERE id=?",
                       (*[d[k] for k in fields], mid))
            db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/lessons", methods=["POST"])
def admin_lms_lesson_create():
    _require_admin()
    d = request.get_json(force=True) or {}
    with get_db() as db:
        m = db.execute("SELECT course_id FROM modules WHERE id=?", (d["module_id"],)).fetchone()
        if not m:
            return jsonify({"error": "bad module"}), 400
        cid = m["course_id"]
        base = (d.get("slug") or d.get("title", "lesson")).lower()
        slug = "".join(ch if ch.isalnum() else "-" for ch in base).strip("-") or "lesson"
        if db.execute("SELECT 1 FROM lessons WHERE course_id=? AND slug=?", (cid, slug)).fetchone():
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"
        n = db.execute("SELECT COALESCE(MAX(sort),-1)+1 s FROM lessons WHERE module_id=?",
                       (d["module_id"],)).fetchone()["s"]
        body_md = d.get("body_md", "")
        cur = db.execute(
            """INSERT INTO lessons (module_id,course_id,title,slug,kind,duration_min,
                   video_url,body_md,body_html,is_free,published,sort)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (d["module_id"], cid, d.get("title", "New lesson"), slug,
             d.get("kind", "reading"), int(d.get("duration_min", 0) or 0),
             d.get("video_url", ""), body_md, render_markdown(body_md),
             int(d.get("is_free", 0)), int(d.get("published", 1)), d.get("sort", n)),
        )
        db.commit()
        return jsonify({"ok": True, "id": cur.lastrowid})


@app.route("/api/admin/lms/lessons/<int:lid>", methods=["GET", "PATCH", "DELETE"])
def admin_lms_lesson(lid):
    _require_admin()
    with get_db() as db:
        if request.method == "GET":
            l = db.execute("SELECT * FROM lessons WHERE id=?", (lid,)).fetchone()
            return (jsonify(dict(l)) if l else (jsonify({"error": "not found"}), 404))
        if request.method == "DELETE":
            db.execute("DELETE FROM lessons WHERE id=?", (lid,))
            db.execute("DELETE FROM resources WHERE lesson_id=?", (lid,))
            db.execute("DELETE FROM lesson_progress WHERE lesson_id=?", (lid,))
            db.commit()
            return jsonify({"ok": True})
        d = request.get_json(force=True) or {}
        if "body_md" in d:
            d["body_html"] = render_markdown(d["body_md"])
        fields = [k for k in ("title", "kind", "duration_min", "video_url", "video_file",
                              "body_md", "body_html", "is_free", "published", "sort",
                              "module_id") if k in d]
        if fields:
            db.execute(
                f"UPDATE lessons SET {', '.join(k + '=?' for k in fields)}, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (*[d[k] for k in fields], lid))
            db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/resources", methods=["POST"])
def admin_lms_resource_create():
    _require_admin()
    if request.content_type and "multipart/form-data" in request.content_type:
        f = request.files.get("file")
        course_id = request.form.get("course_id")
        lesson_id = request.form.get("lesson_id") or None
        title = request.form.get("title") or (f.filename if f else "resource")
        rel, size = _save_upload(f, course_id) if f else (None, 0)
        kind = "file"
        url = ""
        file_path = rel or ""
    else:
        d = request.get_json(force=True) or {}
        course_id = d.get("course_id")
        lesson_id = d.get("lesson_id") or None
        title = d.get("title", "Resource")
        url = d.get("url", "")
        kind = d.get("kind", "link")
        file_path = ""
        size = 0
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO resources (lesson_id,course_id,title,kind,url,file_path,size_bytes) VALUES (?,?,?,?,?,?,?)",
            (lesson_id, course_id, title, kind, url, file_path, size),
        )
        db.commit()
        return jsonify({"ok": True, "id": cur.lastrowid})


@app.route("/api/admin/lms/resources/<int:rid>", methods=["DELETE"])
def admin_lms_resource_delete(rid):
    _require_admin()
    with get_db() as db:
        db.execute("DELETE FROM resources WHERE id=?", (rid,))
        db.commit()
    return jsonify({"ok": True})


@app.route("/api/admin/lms/upload", methods=["POST"])
def admin_lms_upload():
    _require_admin()
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file"}), 400
    course_id = request.form.get("course_id", "misc")
    rel, size = _save_upload(f, course_id)
    return jsonify({"ok": True, "file_path": rel, "size_bytes": size,
                    "preview_url": f"/api/admin/lms/file/{rel}"})


@app.route("/api/admin/lms/file/<path:relpath>", methods=["GET"])
def admin_lms_file(relpath):
    _require_admin()
    safe = os.path.normpath(relpath)
    if safe.startswith("..") or os.path.isabs(safe):
        abort(400)
    path = _media_path(safe)
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, conditional=True)


@app.route("/api/admin/lms/reseed/<course_id>", methods=["POST"])
def admin_lms_reseed(course_id):
    _require_admin()
    with get_db() as db:
        summary = seed_courses(db, only=course_id, force=True)
    return jsonify({"ok": True, "summary": summary})


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

_ACADEMY_ALIASES = {
    "": "index.html",
    "login": "index.html",
    "app": "app.html",
    "home": "app.html",
    "courses": "app.html",
    "dashboard": "app.html",
    "learn": "learn.html",
    "admin": "admin.html",
}

@app.route("/academy/", defaults={"path": ""})
@app.route("/academy/<path:path>")
def serve_academy(path):
    # Extension-less friendly URLs -> real files
    if path in _ACADEMY_ALIASES:
        path = _ACADEMY_ALIASES[path]
    elif path.startswith("course/"):
        parts = path.split("/")
        if len(parts) == 2:
            # /academy/course/<id> -> the player, deep-linked to that course
            return redirect(f"/academy/learn?course={parts[1]}")

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