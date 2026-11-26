CREATE TABLE social_posts (
 id CHAR(36) NOT NULL,
 user_id CHAR(36) NOT NULL,
 body VARCHAR(2000) NOT NULL,
 visibility ENUM('private','connections','public') NOT NULL DEFAULT 'private',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id),
 KEY idx_social_posts_user_created(user_id,created_at),
 CONSTRAINT fk_social_posts_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE social_post_items (
 post_id CHAR(36) NOT NULL,
 knowledge_item_id CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(post_id,knowledge_item_id),
 CONSTRAINT fk_social_post_items_post FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
 CONSTRAINT fk_social_post_items_item FOREIGN KEY(knowledge_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE social_follows (
 follower_id CHAR(36) NOT NULL,
 following_id CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(follower_id,following_id),
 KEY idx_social_follows_following(following_id),
 CONSTRAINT chk_social_follow_not_self CHECK(follower_id <> following_id),
 CONSTRAINT fk_social_follows_follower FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_social_follows_following FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
