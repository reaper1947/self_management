import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "habit_tracker.db")

def init_users_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            courses TEXT NOT NULL,
            magic_token TEXT
        )
    """)
    conn.commit()
    conn.close()
    print("Users table created!")

if __name__ == "__main__":
    init_users_db()
