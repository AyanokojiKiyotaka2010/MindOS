CREATE TABLE users (
 id CHAR(36) NOT NULL, email VARCHAR(254) NOT NULL, password_hash VARCHAR(255) NULL,
 account_status ENUM('active','pending_verification','suspended','deleted') NOT NULL DEFAULT 'pending_verification',
 email_verified_at DATETIME(6) NULL, last_login_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), UNIQUE KEY uq_users_email(email), KEY idx_users_status(account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_profiles (
 user_id CHAR(36) NOT NULL, display_name VARCHAR(80) NULL, username VARCHAR(30) NULL,
 bio VARCHAR(500) NULL, avatar_storage_key VARCHAR(512) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(user_id), UNIQUE KEY uq_user_profiles_username(username),
 CONSTRAINT fk_user_profiles_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_settings (
 user_id CHAR(36) NOT NULL, profile_visibility ENUM('private','connections','public') NOT NULL DEFAULT 'private',
 allow_discovery BOOLEAN NOT NULL DEFAULT FALSE, ai_features_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 timezone VARCHAR(64) NOT NULL DEFAULT 'UTC', locale VARCHAR(20) NOT NULL DEFAULT 'en',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(user_id), CONSTRAINT fk_user_settings_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE knowledge_items (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, title VARCHAR(255) NOT NULL, content LONGTEXT NULL,
 item_type ENUM('note','concept','question','insight','quote','resource','summary') NOT NULL DEFAULT 'note',
 understanding_status ENUM('captured','reviewing','understood','needs_clarification') NOT NULL DEFAULT 'captured',
 is_favorite BOOLEAN NOT NULL DEFAULT FALSE, is_archived BOOLEAN NOT NULL DEFAULT FALSE,
 captured_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), KEY idx_knowledge_user_created(user_id,created_at),
 KEY idx_knowledge_user_status(user_id,understanding_status), KEY idx_knowledge_user_type(user_id,item_type),
 FULLTEXT KEY ft_knowledge_title_content(title,content),
 CONSTRAINT fk_knowledge_items_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE knowledge_sources (
 id CHAR(36) NOT NULL, knowledge_item_id CHAR(36) NOT NULL,
 source_type ENUM('manual','file','url','book','article','video','other') NOT NULL DEFAULT 'manual',
 source_title VARCHAR(255) NULL, source_url VARCHAR(2048) NULL, original_filename VARCHAR(255) NULL,
 mime_type VARCHAR(127) NULL, file_size_bytes BIGINT UNSIGNED NULL, storage_key VARCHAR(512) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(id),
 KEY idx_knowledge_sources_item(knowledge_item_id),
 CONSTRAINT fk_knowledge_sources_item FOREIGN KEY(knowledge_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tags (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, name VARCHAR(50) NOT NULL, color VARCHAR(7) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(id),
 UNIQUE KEY uq_tags_user_name(user_id,name),
 CONSTRAINT fk_tags_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE knowledge_item_tags (
 knowledge_item_id CHAR(36) NOT NULL, tag_id CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(knowledge_item_id,tag_id),
 KEY idx_knowledge_item_tags_tag(tag_id),
 CONSTRAINT fk_kit_knowledge_item FOREIGN KEY(knowledge_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
 CONSTRAINT fk_kit_tag FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE knowledge_relations (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, source_item_id CHAR(36) NOT NULL, target_item_id CHAR(36) NOT NULL,
 relation_type ENUM('related_to','supports','contradicts','expands','depends_on','example_of') NOT NULL DEFAULT 'related_to',
 note VARCHAR(500) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(id),
 UNIQUE KEY uq_knowledge_relation(source_item_id,target_item_id,relation_type),
 KEY idx_knowledge_relations_user(user_id), KEY idx_knowledge_relations_target(target_item_id),
 CONSTRAINT chk_knowledge_relation_not_self CHECK(source_item_id <> target_item_id),
 CONSTRAINT fk_knowledge_relations_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_knowledge_relations_source FOREIGN KEY(source_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
 CONSTRAINT fk_knowledge_relations_target FOREIGN KEY(target_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE learning_goals (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NULL,
 status ENUM('planned','in_progress','paused','completed','abandoned') NOT NULL DEFAULT 'planned',
 target_date DATE NULL, completed_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), KEY idx_learning_goals_user_status(user_id,status), KEY idx_learning_goals_target_date(user_id,target_date),
 CONSTRAINT fk_learning_goals_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reflections (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, title VARCHAR(255) NULL, body LONGTEXT NOT NULL,
 reflection_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), KEY idx_reflections_user_date(user_id,reflection_date), FULLTEXT KEY ft_reflections_title_body(title,body),
 CONSTRAINT fk_reflections_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE decisions (
 id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, title VARCHAR(255) NOT NULL, context LONGTEXT NULL,
 options_considered JSON NULL, chosen_option TEXT NULL, rationale LONGTEXT NULL, decided_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), KEY idx_decisions_user_date(user_id,decided_at), FULLTEXT KEY ft_decisions_title_context(title,context),
 CONSTRAINT fk_decisions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE decision_outcomes (
 id CHAR(36) NOT NULL, decision_id CHAR(36) NOT NULL, outcome_notes LONGTEXT NOT NULL,
 outcome_status ENUM('positive','negative','mixed','unclear','pending') NOT NULL DEFAULT 'pending',
 observed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY(id),
 KEY idx_decision_outcomes_decision_date(decision_id,observed_at),
 CONSTRAINT fk_decision_outcomes_decision FOREIGN KEY(decision_id) REFERENCES decisions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
