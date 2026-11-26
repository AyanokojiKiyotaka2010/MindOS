# Entity Relationships

```mermaid
erDiagram
    USERS ||--o| USER_PROFILES : has
    USERS ||--o| USER_SETTINGS : configures
    USERS ||--o{ KNOWLEDGE_ITEMS : owns
    USERS ||--o{ TAGS : creates
    USERS ||--o{ LEARNING_GOALS : sets
    USERS ||--o{ REFLECTIONS : writes
    USERS ||--o{ DECISIONS : records
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_SOURCES : has
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_ITEM_TAGS : tagged
    TAGS ||--o{ KNOWLEDGE_ITEM_TAGS : labels
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_RELATIONS : source
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_RELATIONS : target
    DECISIONS ||--o{ DECISION_OUTCOMES : evaluated_by
```

`knowledge_relations` is a directed edge table. Both endpoints must belong to the same user; the database foreign keys enforce endpoint existence, while application-level validation in a later phase must enforce same-owner relationships.
