from flask_sqlalchemy import SQLAlchemy
from flask import Flask
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT_STR = os.getenv("MYSQL_PORT", "3306")
MYSQL_PORT = int(MYSQL_PORT_STR) if MYSQL_PORT_STR and MYSQL_PORT_STR.isdigit() else 3306
MYSQL_DB = os.getenv("MYSQL_DB", "finance")

# SQLAlchemy connection string
if MYSQL_USER is not None:
    try:
        # Check for Render Postgres or generic Postgres config
        if MYSQL_PORT == 5432 or 'postgres' in MYSQL_HOST:
             import psycopg2
             app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
             print(f"✅ [Database] Using PostgreSQL ({MYSQL_HOST})")
        else:
             import mysql.connector
             import urllib.parse
             password_safe = urllib.parse.quote_plus(MYSQL_PASSWORD)
             app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+mysqlconnector://{MYSQL_USER}:{password_safe}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
             print(f"✅ [Database] Using MySQL ({MYSQL_HOST})")
             
    except ImportError as e:
        print(f"❌ [Database] Driver missing ({e}). Falling back to SQLite.")
        base_dir = os.path.abspath(os.path.dirname(__file__))
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'app.db')
        print(f"⚠️ [Database] Using SQLite (Fallback)")
else:
    # Direct URI support (RENDER DEFAULT)
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("postgres"):
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://", 1)
        print("✅ [Database] Using PostgreSQL (from DATABASE_URL)")
    else:
        base_dir = os.path.abspath(os.path.dirname(__file__))
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'app.db')
        print("⚠️ [Database] Using SQLite (No SQL Config Found)")
        
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
