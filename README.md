# JokeSpot
Click [here](https://docs.google.com/document/d/19dSgZBABDFpBwUpLKL_f__rQPF5DS8fKPoREig0cU00/edit?usp=sharing) for our project statement.
Alternatively a pdf version is available in the MilestoneSubmissions folder in this repo.

## Application Description
JokeSpot is a social media platform for creating, tagging, sharing, and rating written jokes. Jokes can be browsed and filtered based on ratings, tags, and users. Other users can like or dislike jokes, with the rating appearing as a ratio of likes to dislikes. Users can comment on others’ posts and those with reviewer status are highlighted. It differs from other social media platforms in the sense that its scope is purely comedic, discouraging news and discourse. This purpose is maintained by the rating system. There would also be the option to flag posts for review (report) if they get around initial checks. Superusers, content moderators, can review flagged posts and decide what to do with them.
Like other social media platforms, people must create user accounts to create posts. User profiles will be complete with names and photos. The average rating of a user’s jokes will be posted on their profiles, as well as their rankings (leaderboard) based on their average ratings. Users will be given a title based on their rating bracket. Additionally, users will be given the option to make their accounts private, excluding them from searches and making their profile stats hidden to others. Their jokes, however, will still show up on feeds, allowing others to still see their jokes and interact with them.
Upon opening JokeSpot, the “Joke of the Day” will be displayed with a button, to go to the feed, below it. The feed is a simple, scrollable page of jokes. Like other platforms, like X and instagram, users scroll their feed, this is the primary way to view and interact with jokes. The other way is to search and filter through jokes.

## Contributors
    - Sam Shoemaker
    - Michael Kulakovsky
    - Stephen Buch
    - Smith Mefford
    - Kellen Partridge

## Technology Stack
Front-End:
    - HTML
    - Handlebars
    - CSS
    - Bootstrap 5
    - JavaScript

Back-End:
    - Node.js
    - Express.js

Database:
    - PostgreSQL

DevOps:
    - Docker (containerization)
    - Render (hosting)

## Prerequesites
    - Docker Engine
    - Docker Compose
    - Node.js
    - npm

## Running Locally
To run locally, you must...
    - Navigate to the ProjectSourceCode directory
    - Install packages for node by running the command "npm install"
    - Run the command "docker compose up -d" to start the containers for the web app and database in the background
        - Remove "-d" to run them in the foreground
    - Run the command "docker compose down" to stop the containers
        - If running in the foreground, hit CTRL-C to stop the application, then run the command

## How to run the tests
To run the tests...
    - Open "docker-compose.yaml"
    - Under the "web" container, change the command "npm start" to "npm run testandrun"
    - Use Docker to start the containers

## Link to the deployed application
https://jokespot.onrender.com/home