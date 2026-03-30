-- Skeleton setup, revise this later this week
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username varchar(60) UNIQUE NOT NULL,
    password varchar(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    poster varchar(60) NOT NULL,
    content text NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);