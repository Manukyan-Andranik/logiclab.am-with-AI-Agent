"""
Idempotent migration script. Run with: python migrate.py

Applies schema fixes that the SQLAlchemy models expect but were never
synced to the production database:
  1. Adds courses.order_index, courses.hero_video_url
  2. Adds material_access.lesson_id (FK to lessons, ON DELETE CASCADE)
  3. Rewrites students.last_chapter_id / last_lesson_id FKs to ON DELETE SET NULL
"""
import psycopg2
from app.core.config import settings


def column_exists(cur, table, column):
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        """,
        (table, column),
    )
    return cur.fetchone() is not None


def fk_constraint_name(cur, table, column):
    cur.execute(
        """
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name      = %s
          AND kcu.column_name    = %s
        """,
        (table, column),
    )
    row = cur.fetchone()
    return row[0] if row else None


def fk_delete_rule(cur, constraint_name):
    cur.execute(
        """
        SELECT delete_rule FROM information_schema.referential_constraints
        WHERE constraint_name = %s
        """,
        (constraint_name,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def ensure_set_null_fk(cur, table, column, ref_table):
    name = fk_constraint_name(cur, table, column)
    if name and fk_delete_rule(cur, name) == "SET NULL":
        return False
    if name:
        cur.execute(f'ALTER TABLE {table} DROP CONSTRAINT "{name}"')
    cur.execute(
        f'ALTER TABLE {table} ADD CONSTRAINT "{table}_{column}_fkey" '
        f'FOREIGN KEY ({column}) REFERENCES {ref_table}(id) ON DELETE SET NULL'
    )
    return True


def run():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    actions = []

    if not column_exists(cur, "courses", "order_index"):
        cur.execute("ALTER TABLE courses ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0")
        actions.append("courses.order_index added")

    if not column_exists(cur, "courses", "hero_video_url"):
        cur.execute("ALTER TABLE courses ADD COLUMN hero_video_url VARCHAR(500)")
        actions.append("courses.hero_video_url added")

    if not column_exists(cur, "material_access", "lesson_id"):
        cur.execute(
            "ALTER TABLE material_access ADD COLUMN lesson_id INTEGER "
            "REFERENCES lessons(id) ON DELETE CASCADE"
        )
        actions.append("material_access.lesson_id added")

    if ensure_set_null_fk(cur, "students", "last_chapter_id", "chapters"):
        actions.append("students.last_chapter_id FK -> ON DELETE SET NULL")
    if ensure_set_null_fk(cur, "students", "last_lesson_id", "lessons"):
        actions.append("students.last_lesson_id FK -> ON DELETE SET NULL")

    conn.commit()
    if actions:
        print("Applied:")
        for a in actions:
            print(f"  - {a}")
    else:
        print("Nothing to do — schema already up to date.")
    conn.close()


if __name__ == "__main__":
    run()
