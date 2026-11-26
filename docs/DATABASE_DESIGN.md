# MINDOS Phase 2 database design

MySQL 8.0.16+, InnoDB, utf8mb4. Twelve tables cover users, profiles, settings, knowledge items and sources, tags, graph relations, learning goals, reflections, decisions and decision outcomes. Knowledge defaults to captured, not understood. File bytes belong in private object storage. Ownership checks must also be enforced by the API.
