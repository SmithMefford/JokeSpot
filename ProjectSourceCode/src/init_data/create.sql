-- Skeleton setup, revise this later this week
CREATE TABLE IF NOT EXISTS users (
    username varchar(60) PRIMARY KEY,
    password varchar(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    poster varchar(60) NOT NULL,
    content text NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);