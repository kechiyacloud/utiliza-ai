import psycopg2
from psycopg2 import pool
import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local', override=True)

# Global pool instance
_pool = None

def get_db_pool():
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            1, 20, # min/max connections
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            connect_timeout=5
        )
    return _pool

def get_db_connection():
    """Gets a connection from the pool."""
    return get_db_pool().getconn()

def release_db_connection(conn):
    """Returns a connection to the pool."""
    if _pool:
        _pool.putconn(conn)
