"""
Vercel entrypoint wrapper.

This file exposes the Flask `app` instance for Vercel by importing
the application defined in `backend/app.py`.
"""
from backend.app import app

# Ensure the module exposes a variable named `app`.
