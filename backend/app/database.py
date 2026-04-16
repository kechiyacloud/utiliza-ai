import psycopg2
from psycopg2 import pool
import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local', override=True)

from contextlib import contextmanager

# Global pool instance
_pool = None

def get_db_pool():
    global _pool
    if _pool is None:
        try:
            # Use environment variables with defaults
            host = os.getenv("DB_HOST", "localhost")
            port = os.getenv("DB_PORT", "5432")
            database = os.getenv("DB_NAME", "utiliza_ai")
            user = os.getenv("DB_USER", "postgres")
            password = os.getenv("DB_PASSWORD", "postgres")

            _pool = pool.ThreadedConnectionPool(
                minconn=5,
                maxconn=50,
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                connect_timeout=10
            )
            print(f"Database pool initialized: {host}:{port}/{database} (maxconn=50)")
        except Exception as e:
            print(f"CRITICAL: Failed to initialize database pool: {e}")
            raise e
    return _pool

def get_db_connection():
    """Gets a connection from the pool."""
    p = get_db_pool()
    return p.getconn()

def release_db_connection(conn):
    """Returns a connection to the pool."""
    if _pool and conn:
        try:
            _pool.putconn(conn)
        except pool.PoolError as e:
            print(f"PoolError during putconn: {e}")
        except Exception as e:
            print(f"Unexpected error releasing connection: {e}")

@contextmanager
def db_cursor():
    """Context manager for database cursor with automatic connection release."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except:
                pass
        print(f"Database error in db_cursor: {e}")
        raise e
    finally:
        if cur:
            try:
                cur.close()
            except:
                pass
        if conn:
            release_db_connection(conn)
