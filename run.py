"""
PHOTIFY Launcher
================
One-command startup: python run.py
"""
import sys
import os
import webbrowser
import threading
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import HOST, PORT
from app import app, initialize


def open_browser():
    """Open browser after a short delay to let server start."""
    time.sleep(1.5)
    webbrowser.open(f"http://{HOST}:{PORT}")


def main():
    print(r"""
    ╔═══════════════════════════════════════╗
    ║        ● PHOTIFY Music Player         ║
    ║      Local-First. Zero Cloud.         ║
    ╚═══════════════════════════════════════╝
    """)
    print(f"  🎵 Starting server at http://{HOST}:{PORT}")
    print(f"  📁 Database: photify.db")
    print(f"  🎨 Press Ctrl+C to stop\n")

    initialize()

    # Open browser in background
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        app.run(host=HOST, port=PORT, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n  👋 PHOTIFY stopped. See you next time!")


if __name__ == "__main__":
    main()
