import sqlite3
import json
import re

DB_PATH = "habit_tracker.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    rows = cursor.execute("SELECT key, value FROM store WHERE key IN ('checked', 'sleep', 'journal')").fetchall()
    
    for row in rows:
        key = row["key"]
        value_str = row["value"]
        
        # We need to replace all occurrences of "2026-5-" with "2026-6-" in the JSON keys
        # We can just do a string replace on the JSON representation
        new_value_str = value_str.replace('"2026-5-', '"2026-6-')
        
        cursor.execute("UPDATE store SET value = ? WHERE key = ?", (new_value_str, key))
        print(f"Updated {key}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
