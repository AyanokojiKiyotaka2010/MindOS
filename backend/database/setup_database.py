from pathlib import Path
import getpass, re, sys
try:
    import pymysql
except ImportError:
    print("PyMySQL missing. Run: python -m pip install PyMySQL")
    raise SystemExit(1)

HERE = Path(__file__).resolve().parent
SQL_PATH = HERE / "migrations" / "001_initial_schema.up.sql"
EXPECTED = {
    "users","user_profiles","user_settings","knowledge_items","knowledge_sources",
    "tags","knowledge_item_tags","knowledge_relations","learning_goals",
    "reflections","decisions","decision_outcomes"
}

def main():
    if not SQL_PATH.exists():
        print(f"Migration not found: {SQL_PATH}")
        return 1
    host = input("MySQL host [localhost]: ").strip() or "localhost"
    port = int(input("MySQL port [3306]: ").strip() or "3306")
    user = input("MySQL username [mindos_app]: ").strip() or "mindos_app"
    db = input("Database [mindos]: ").strip() or "mindos"
    password = getpass.getpass(f"Password for {user} (hidden): ")
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password,
                               database=db, charset="utf8mb4", autocommit=True,
                               connect_timeout=10)
    except Exception as exc:
        print(f"Connection failed: {exc}")
        return 1
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION()")
            version = cur.fetchone()[0]
            print(f"Connected to MySQL {version}, database {db}.")
            match = re.match(r"^(\\d+)\\.(\\d+)\\.(\\d+)", version)
            if match and tuple(map(int, match.groups())) < (8, 0, 16):
                print("MySQL 8.0.16 or newer is required.")
                return 1
            cur.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=%s AND TABLE_TYPE='BASE TABLE'", (db,))
            existing = {r[0] for r in cur.fetchall()}
            found = existing & EXPECTED
            if found == EXPECTED:
                print("SUCCESS: all 12 MINDOS tables already exist; no changes made.")
                return 0
            if found:
                print("SAFETY STOP: partial MINDOS schema found; no migration was run.")
                print("Existing expected tables: " + ", ".join(sorted(found)))
                print("Share this list for inspection. Do not rerun blindly.")
                return 2
            sql = SQL_PATH.read_text(encoding="utf-8")
            sql = re.sub(r"(?m)^\\s*--.*$", "", sql)
            statements = [s.strip() for s in sql.split(";") if s.strip()]
            for i, statement in enumerate(statements, 1):
                cur.execute(statement)
                print(f"Executed table statement {i}/{len(statements)}")
            cur.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=%s AND TABLE_TYPE='BASE TABLE'", (db,))
            after = {r[0] for r in cur.fetchall()}
            missing = EXPECTED - after
            if missing:
                print("Migration incomplete. Missing: " + ", ".join(sorted(missing)))
                print("Stop and share the error/output; do not rerun blindly.")
                return 1
            print("SUCCESS: all 12 MINDOS tables are present.")
            return 0
    except Exception as exc:
        print(f"Migration error: {exc}")
        print("MySQL DDL may partially complete. Stop and share the error; do not rerun blindly.")
        return 1
    finally:
        conn.close()

if __name__ == "__main__":
    raise SystemExit(main())
