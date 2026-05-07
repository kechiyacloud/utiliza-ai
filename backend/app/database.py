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
    """Gets a connection from the pool with validation."""
    global _pool
    p = get_db_pool()
    try:
        conn = p.getconn()
        
        # Health check: if connection is closed or unusable, drop and get new one
        if conn.closed != 0:
            print("Detected closed connection in pool, discarding and retrying...")
            try:
                p.putconn(conn, close=True)
            except:
                pass
            return get_db_connection()
            
        return conn
    except (pool.PoolError, AttributeError) as e:
        # If pool is destroyed/closed, re-initialize
        print(f"Pool error: {e}. Re-initializing database pool...")
        _pool = None
        return get_db_connection()
    except Exception as e:
        print(f"Error getting connection from pool: {e}")
        raise e

def release_db_connection(conn):
    """Returns a connection to the pool, closing it if it has transaction errors or is unkeyed."""
    global _pool
    if conn:
        try:
            if _pool:
                # If the connection is broken or closed, return it to pool with close=True
                if conn.closed != 0:
                    _pool.putconn(conn, close=True)
                else:
                    _pool.putconn(conn)
            else:
                # No pool exists, just close the connection
                conn.close()
        except pool.PoolError as e:
            # This happens if the pool was re-initialized and doesn't recognize this connection
            if "unkeyed" in str(e).lower():
                try:
                    conn.close()
                except:
                    pass
            else:
                print(f"PoolError during putconn: {e}")
        except Exception as e:
            print(f"Unexpected error releasing connection: {e}")
            try:
                conn.close()
            except:
                pass

def close_all_connections():
    """Closes all connections in the pool."""
    global _pool
    if _pool:
        print("Closing all database connections in pool")
        _pool.closeall()
        _pool = None


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
