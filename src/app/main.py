# src/app/main.py
from fastapi import FastAPI
from .api import app  # reexporta app para gunicorn/uvicorn
