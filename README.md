# MINDOS — Phase 2: MySQL Database Architecture

This phase defines the first relational database schema for MINDOS. It is intentionally a **database-design and SQL-migration phase**. It does not yet implement authentication, API repositories, or frontend data fetching; those belong to later phases.

## Requirements

- MySQL 8.0.16+ (CHECK constraints are enforced from this version)
- InnoDB storage engine
- `utf8mb4` character set

## Package contents

```text
backend/
  database/
    schema.sql
    migrations/
      001_initial_schema.up.sql
      001_initial_schema.down.sql
docs/
  DATABASE_DESIGN.md
  ENTITY_RELATIONSHIPS.md
```

## Apply the schema

1. Install and start MySQL.
2. Open a terminal in the project directory.
3. Create a database and a dedicated application user. Replace the example password before running:

```sql
CREATE DATABASE mindos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'mindos_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON mindos.* TO 'mindos_app'@'localhost';
FLUSH PRIVILEGES;
```

4. Apply the initial migration. From PowerShell, if the MySQL client is available on PATH:

```powershell
mysql -u root -p mindos < backend/database/migrations/001_initial_schema.up.sql
```

Or open the `.up.sql` file in MySQL Workbench and execute it against the `mindos` database.

The `schema.sql` file is a convenient copy of the complete initial schema. Use **either** `schema.sql` **or** the `.up.sql` migration, not both.

## Verify

Run these statements in MySQL Workbench or the MySQL client:

```sql
USE mindos;
SHOW TABLES;
SHOW CREATE TABLE users;
```

The initial migration creates 12 tables. Confirm with:

```sql
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'mindos'
  AND table_type = 'BASE TABLE';
```

Expected result: `12`.

## Roll back (destructive)

Only if you intentionally want to remove all Phase 2 tables and their data:

```powershell
mysql -u root -p mindos < backend/database/migrations/001_initial_schema.down.sql
```

**Warning:** the down migration drops all Phase 2 tables and permanently deletes their data.

## Configuration for later phases

Phase 3 will connect the backend to this database. Keep credentials out of source control. A future `.env` entry will look like:

```env
DATABASE_URL=mysql+pymysql://mindos_app:YOUR_PASSWORD@127.0.0.1:3306/mindos?charset=utf8mb4
```

The application driver/SQLAlchemy integration will be installed and wired in the backend during the relevant implementation phase. Do not paste real credentials into GitHub.

## Design decisions

- UUIDs are stored as `CHAR(36)` for readability and straightforward debugging.
- User-owned records reference `users.id` and cascade on user deletion.
- Knowledge items distinguish captured content from reviewed/understood content.
- Knowledge relationships are stored as relational edges; graph visualization can be added later.
- Large uploaded file bytes are not stored in MySQL. `knowledge_sources` stores metadata and a private storage key.
- No IQ, intelligence, or psychological diagnosis scores are modeled.
- Sharing/social tables are deferred to the Social Network phase.
