-- Skeleton setup, revise this later this week
-- Updated to include user profile fields and joke rating fields
CREATE TABLE IF NOT EXISTS users (
    username varchar(60) PRIMARY KEY NOT NULL,
    password varchar(255) NOT NULL,
    display_name varchar(100),
    profile_photo_url varchar(255) DEFAULT '/img/default_profile_1.png',
    is_private BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    poster varchar(60) NOT NULL,
    content text NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    likes INT DEFAULT 0,
    dislikes INT DEFAULT 0
);