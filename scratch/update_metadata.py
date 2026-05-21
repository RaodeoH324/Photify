import sqlite3
import os

DB_PATH = '../photify.db'

updates = {
    "shararat": "Shashwat Sachdev",
    "ishq jala kar karwaan": "Shashwat Sachdev, Roshan",
    "Tum Se Hi": "Pritam",
    "Tum Tak": "A.R. Rahman",
    "Chal Ga Sakhe": "Abhanga Repost",
    "Jai Aadhyashakti": "Chintan Trivedi"
}

def update_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for title, artist in updates.items():
        print(f"Updating '{title}' to artist '{artist}'...")
        cursor.execute(
            "UPDATE tracks SET artist = ? WHERE title LIKE ?",
            (artist, f"%{title}%")
        )
        print(f"Rows affected: {cursor.rowcount}")

    conn.commit()
    conn.close()
    print("Database update complete.")

if __name__ == "__main__":
    update_db()
