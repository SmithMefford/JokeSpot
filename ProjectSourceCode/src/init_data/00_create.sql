CREATE TABLE IF NOT EXISTS users (
    username varchar(60) PRIMARY KEY NOT NULL,
    password varchar(255) NOT NULL,
    profile_photo_url varchar(255) DEFAULT '/img/default_profile_1.png',
    is_private BOOLEAN DEFAULT FALSE,
    profanity_filter BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    auto_refresh BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    author varchar(60) NOT NULL,
    FOREIGN KEY (author) REFERENCES users (username) ON DELETE CASCADE,
    content varchar(500) NOT NULL,
    censored_content varchar(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags varchar(200)
);

CREATE TABLE IF NOT EXISTS joke_reactions (
    joke_id INT NOT NULL,
    username varchar(60) NOT NULL,
    reaction VARCHAR(10) CHECK (reaction IN ('like', 'dislike')),
    PRIMARY KEY (joke_id, username),
    FOREIGN KEY (joke_id) REFERENCES jokes (id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS joke_reports (
    id SERIAL PRIMARY KEY,
    joke_id INT NOT NULL,
    reporter_username varchar(60) NOT NULL,
    reason VARCHAR(50) CHECK (reason IN ('spam', 'offensive', 'misinformation', 'other')),
    details varchar(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (joke_id) REFERENCES jokes (id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_username) REFERENCES users (username) ON DELETE CASCADE,
    UNIQUE (joke_id, reporter_username)
);