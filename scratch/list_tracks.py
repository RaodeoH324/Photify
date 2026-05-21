import sqlite3

def list_tracks():
    conn = sqlite3.connect('../photify.db')
    conn.row_factory = sqlite3.Row
    tracks = conn.execute('SELECT id, title, artist, file_path FROM tracks').fetchall()
    for t in tracks:
        print(f"ID: {t['id']} | Title: {t['title']} | Artist: {t['artist']} | Path: {t['file_path']}")
    conn.close()

if __name__ == "__main__":
    list_tracks()
