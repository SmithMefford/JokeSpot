// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { hasProfanity, censorText } = require('./profanityFilter');
const fs = require('fs');
const multer = require('multer');

// *****************************************************
// Section 2: Configure Handlebars & Database
// *****************************************************

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq: (a, b) => a === b
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static resources (CSS/JS)
app.use('/css', express.static(path.join(__dirname, 'resources', 'css')));
app.use('/js', express.static(path.join(__dirname, 'resources', 'js')));
app.use('/img', express.static(path.join(__dirname, 'resources', 'img')));

const pfpDir = path.join(__dirname, 'resources', 'img', 'pfp');
if (!fs.existsSync(pfpDir)) {
  fs.mkdirSync(pfpDir, { recursive: true });
}

// Set up Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pfpDir); 
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.session.user.username + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage: storage });

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'superdupersecret!',
    saveUninitialized: false,
    resave: false,
  })
);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Database config
const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const db = pgp(dbConfig);

// Test DB connection
db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.error('Database connection error:', error.message || error);
  });

// *****************************************************
// Section 3: Middleware & Helpers
// *****************************************************

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

const onlyUser0 = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/home');
  }
  if (req.session.user.username !== 'user0') {
    return res.status(403).render('pages/403', {
      message: '403: Access denied.',
      error: true
    });
  }
  next();
};

function timeAgo(date) {
  if (!date) return "Unknown time";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return "Just now";
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (let i = 0; i < intervals.length; i++) {
    const interval = Math.floor(seconds / intervals[i].seconds);
    if (interval >= 1) {
      return `${interval} ${intervals[i].label}${interval !== 1 ? 's' : ''} ago`;
    }
  }
  return "Just now";
}

// *****************************************************
// Section 4: Routes
// *****************************************************

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/login', (req, res) => {
  res.render('pages/login', {
    message: req.query.logout ? "Logged out successfully!" : null,
    error: false
  });  
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.get('/home', async (req, res) => {
  // Retrieve Joke of the Day from the Database 
  // date generates hash & must be a day old
  try {
    const jokeOfTheDay = await db.one(
        `SELECT * FROM jokes
        WHERE "timestamp" < CURRENT_DATE
        ORDER BY md5(id::text || CURRENT_DATE::text)
        LIMIT 1`
    );

    let jokeOfTheDayMessage = jokeOfTheDay.content;
    if (req.session.user && req.session.user.profanity_filter)
        jokeOfTheDayMessage = jokeOfTheDay.censored_content;

    res.render('pages/home', {
        user: res.locals.user,
        message: jokeOfTheDayMessage,
        featuredAuthor: jokeOfTheDay.author,
        error: false
    });
  }
  catch (err) {
    console.error(err);
    res.render('pages/home', {
        user: res.locals.user,
        message: 'Joke\'s on us: Failed to retrieve the Joke of the Day.',
        featuredAuthor: 'JokeSpot Dev Team',
        error: true
    });
  }
});

app.get('/admin', onlyUser0, async (req, res) => {
  try {
    const reports = await db.any(`
      SELECT jr.id, jr.joke_id, jr.reason, jr.details, jr.created_at, jr.reviewed,
             j.content, j.author
      FROM joke_reports jr
      JOIN jokes j ON jr.joke_id = j.id
      WHERE jr.reviewed = FALSE
      ORDER BY jr.created_at DESC
    `);

    const flaggedUsers = await db.any(`
      SELECT j.author, COUNT(jr.id) AS report_count,
             MAX(jr.created_at) AS latest_report,
             (SELECT jr2.reason FROM joke_reports jr2
              JOIN jokes j2 ON jr2.joke_id = j2.id
              WHERE j2.author = j.author
              ORDER BY jr2.created_at DESC LIMIT 1) AS latest_reason
      FROM joke_reports jr
      JOIN jokes j ON jr.joke_id = j.id
      GROUP BY j.author
      ORDER BY report_count DESC
    `);

    const pendingCount = await db.one(`
      SELECT COUNT(*) FROM joke_reports WHERE reviewed = FALSE
    `);

    const flaggedCount = await db.one(`
      SELECT COUNT(DISTINCT j.author) AS count
      FROM joke_reports jr
      JOIN jokes j ON jr.joke_id = j.id
    `);

    const reviewedToday = await db.one(`
      SELECT COUNT(*) FROM joke_reports
      WHERE reviewed = TRUE
      AND created_at >= CURRENT_DATE
    `);

    res.render('pages/admin', {
      user: res.locals.user,
      reports,
      flaggedUsers,
      pendingCount: pendingCount.count,
      flaggedCount: flaggedCount.count,
      reviewedToday: reviewedToday.count
    });
  } catch (error) {
    console.error(error);
    res.redirect('/home');
  }
});

app.post('/admin/dismiss/:reportId', onlyUser0, async (req, res) => {
  try {
    await db.none(
      'UPDATE joke_reports SET reviewed = TRUE WHERE id = $1',
      [req.params.reportId]
    );
    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.redirect('/admin');
  }
});

app.post('/admin/delete/:jokeId', onlyUser0, async (req, res) => {
  try {
    await db.none(
      'DELETE FROM jokes WHERE id = $1',
      [req.params.jokeId]
    );
    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.redirect('/admin');
  }
});

app.post('/admin/delete-user/:username', onlyUser0, async (req, res) => {
  try {
    await db.none(
      'DELETE FROM users WHERE username = $1',
      [req.params.username]
    );
    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.redirect('/admin');
  }
});

app.post('/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    
    const defaultAvatars = [
      '/img/default_profile_1.png',
      '/img/default_profile_2.png',
      '/img/default_profile_3.png',
      '/img/default_profile_4.png',
      '/img/default_profile_5.png'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const profanityFilterEnabled = req.body.profanity_filter === "true";

    await db.none(
      'INSERT INTO users(username, password, profile_photo_url, profanity_filter) VALUES($1, $2, $3, $4)',
      [req.body.username, hash, randomAvatar, profanityFilterEnabled]
    );
    const user = await db.one(
      'SELECT * FROM users WHERE username = $1',
      [req.body.username]
    );

    req.session.user = user;
    req.session.save();

    return res.redirect('/home');
  } catch (error) {
    res.status(400).render('pages/register', {
      message: 'That account already exists!',
      error: true
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const user = await db.oneOrNone(
      'SELECT * FROM users WHERE username = $1',
      [req.body.username]
    );
    if (!user) {
      return res.status(400).render('pages/login', {
        message: 'No account found',
        error: true
      });
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return res.status(400).render('pages/login', {
        message: 'Incorrect username or password.',
        error: true
      });
    }

    req.session.user = user;
    req.session.save();
    res.status(200).redirect('/home');
  } catch (error) {
    res.status(400).redirect('/login');
  }
});

app.get('/logout', auth, (req, res) => {
  req.session.destroy((err) => { 
    if (err) {
      console.log(err);
      return res.status(400).redirect('/home');
    }

    res.clearCookie('connect.sid');
    return res.redirect('/login?logout=1');
  });
});

app.get('/settings', auth, async (req, res) => {
  try {
    const user = await db.one(
      'SELECT * FROM users WHERE username = $1',
      [req.session.user.username]
    );

    req.session.user = user;
    res.locals.user = user;

    res.render('pages/settings', {
      user,
      message: 'Welcome to JokeSpot settings!',
      error: false
    });

  } catch (err) {
    console.error(err);
    res.render('pages/settings', {
      user: req.session.user,
      message: 'Error loading settings',
      error: true
    });
  }
});

app.get('/jokecreate', auth, (req,res) => {
  res.render('pages/jokecreate', {
    user: res.locals.user,
    message: 'post your joke!',
    error: false
  });
});

app.post('/jokecreate', auth, async (req, res) => {
  const { jokeContent, tags } = req.body;

  if (!jokeContent) {
    return res.status(400).send("Missing field");
  }

  try {
    // Soft catch: Censor profanity if present
    const censored = hasProfanity(jokeContent)
      ? censorText(jokeContent)
      : jokeContent;

    await db.none(
      `INSERT INTO jokes (author, content, censored_content, tags)
       VALUES ($1, $2, $3, $4)`,
      [req.session.user.username, jokeContent, censored, tags]
    );

    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.get('/profanityList', (req, res) => {
  const filePath = path.join(__dirname, 'resources', 'filters', 'profanity_censor.csv');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const words = raw
      .split('\n')
      .slice(1)
      .map(line => line.trim().replace(/\r/g, ''))
      .filter(Boolean);
    res.json(words);
  } catch (err) {
    console.error("Error reading profanity list:", err);
    res.json([]);
  }
});

app.get('/hateSpeechList', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'resources', 'filters', 'hate_speech_block.csv');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const words = raw
        .split('\n')
        .slice(1) // Skip CSV header
        .map(line => line.trim().replace(/\r/g, ''))
        .filter(Boolean);
      res.json(words);
    } else {
      res.json([]); 
    }
  } catch (error) {
    console.error("Error reading hate speech list:", error);
    res.json([]);
  }
});

app.get('/leaderboards', (req,res) => {
  res.render('pages/leaderboard', { 
    user: res.locals.user
  });
});

app.get('/feed', auth, (req,res) => {
  try {
    res.render('pages/feed', { 
      user: res.locals.user,
      error: false
    });
  } catch (err) {
    res.redirect('/login');
  }
});

app.post('/settings', auth, async (req, res) => {
  try {
    const username = req.session.user.username;

    const dark_mode = req.body.darkMode === "on";
    const profanity_filter = req.body.profanity_filter === "on";
    const auto_refresh = req.body.autoRefresh === "on";
    const is_private = req.body.profileVisibility === "on";

    await db.none(
      `UPDATE users
       SET dark_mode = $1,
           profanity_filter = $2,
           auto_refresh = $3,
           is_private = $4
       WHERE username = $5`,
      [dark_mode, profanity_filter, auto_refresh, is_private, username]
    );

    req.session.user = {
      ...req.session.user,
      dark_mode,
      profanity_filter,
      auto_refresh,
      is_private
    };

    res.redirect('/settings');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// *****************************************************
// Section 4.1: Profile Routes
// *****************************************************

// Profile Edit page (GET)
app.get('/profile-edit', auth, async (req, res) => {
  try {
    const user = await db.one('SELECT * FROM users WHERE username = $1', [req.session.user.username]);
    res.status(200).render('pages/profile-edit', {
      user: user
    });
  } catch (error) {
    console.error(error);
    res.status(400).redirect('/profile');
  }
});

// Profile Edit page (POST) - Updates database
app.post('/profile-edit', auth, upload.single('profile_picture'), async (req, res) => {
  try {
    const isPrivate = req.body.is_private === 'on';
    
    const currentUser = await db.one('SELECT profile_photo_url FROM users WHERE username = $1', [req.session.user.username]);
    let newPhotoUrl = currentUser.profile_photo_url;

    if (req.file) {
        newPhotoUrl = '/img/pfp/' + req.file.filename;
    }

    await db.none(
      'UPDATE users SET profile_photo_url = $1, is_private = $2 WHERE username = $3',
      [newPhotoUrl, isPrivate, req.session.user.username]
    );
    
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.redirect('/profile-edit');
  }
});

// Profile page (Dynamic based on username parameter)
app.get('/profile/:username?', auth, async (req, res) => {
  try {
    const targetUsername = req.params.username || req.session.user.username;
    const isOwner = targetUsername === req.session.user.username;

    const profileUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [targetUsername]);

    if (!profileUser) {
      return res.redirect('/home');
    }

    const isPrivateView = profileUser.is_private && !isOwner;

    // UPDATED: Dynamically calculate Total Likes and Leaderboard Rank using a CTE Window Function
    const statsQuery = `
      WITH UserLikes AS (
          SELECT u.username, COUNT(jr.joke_id) AS total_likes
          FROM users u
          LEFT JOIN jokes j ON u.username = j.author
          LEFT JOIN joke_reactions jr ON j.id = jr.joke_id AND jr.reaction = 'like'
          GROUP BY u.username
      )
      SELECT total_likes, rank FROM (
          SELECT username, total_likes, RANK() OVER (ORDER BY total_likes DESC) as rank
          FROM UserLikes
      ) ranked
      WHERE username = $1;
    `;
    
    const stats = await db.oneOrNone(statsQuery, [targetUsername]);

    res.render('pages/profile', {
      display_name: profileUser.display_name || profileUser.username,
      username: profileUser.username,
      profile_photo_url: profileUser.profile_photo_url,
      is_private_view: isPrivateView,
      is_owner: isOwner,
      total_likes: stats ? stats.total_likes : 0, 
      rank: stats ? stats.rank : '-',             
      rating_title: "Open Mic Rookie"
    });
  } catch (error) {
    console.error(error);
    res.redirect('/home');
  }
});

// *****************************************************
// Section 4.2: Interaction & Post Routes
// *****************************************************

app.post('/rateJoke', async (req,res) => {
  try {
    const interaction = req.body.data;
    const jokeID = Object.values(interaction)[0];
    const user = req.session.user.username;
    const rating = Object.values(interaction)[1];
    const searchInteractions = `SELECT * FROM joke_reactions WHERE joke_id = ${jokeID} AND username = '${user}';`;
    db.oneOrNone(searchInteractions)
      .then((entry) => {
        let reactionQuery;
        if (entry) { 
          if ((rating == 'like') || (rating == 'dislike')) {
            reactionQuery = `UPDATE joke_reactions SET reaction = '${rating}' WHERE joke_id = ${jokeID} AND username = '${user}';`;
          } else {
            reactionQuery = `DELETE FROM joke_reactions WHERE joke_id = ${jokeID} AND username = '${user}';`;
          }
        } else {
          reactionQuery = `INSERT INTO joke_reactions (joke_id, username, reaction) VALUES (${jokeID}, '${user}', '${rating}');`;
        }
        console.log(reactionQuery);
        db.none(reactionQuery);
      })
      .catch((error) => {
        console.error(error);
      });
  } catch (error) {
    res.status(500).send("Failed to interact with joke.")
  }
});

app.post('/reportJoke', async (req, res) => {
  try {
    const report = req.body.data;
    const jokeID = report.joke_id;
    const user = req.session.user.username;
    const reason = report.report_reason;
    const details = report.report_explanation;
    const reportQuery = `INSERT INTO joke_reports (joke_id, reporter_username, reason, details) VALUES (${jokeID}, '${user}','${reason}', '${details}');`;
    await db.none(reportQuery);
  } catch(err) {
    res.status(500).send("Failed to report joke.");
  }
});

app.post('/loadJokes', async (req, res) => {
  try {
    const data         = req.body;
    const jokes_loaded = data.loaded || 0;
    let searchQuery    = '';
    
    // Sort logic from your feature branch
    const sortOrder = data.sortOrder === 'oldest' ? 'ASC' : 'DESC';

    if ("searchType" in data && data.searchBar) {
      const search = data.searchBar;
      const type   = data.searchType;
      searchQuery  = type === 'content'
        ? `WHERE content ILIKE '%${search}%'`
        : `WHERE tags ILIKE '%${search}%'`;
    }

    const joke = await db.oneOrNone(
      `SELECT * FROM jokes ${searchQuery}
       ORDER BY timestamp ${sortOrder}, id ${sortOrder}
       LIMIT 1 OFFSET $1`,
      [jokes_loaded]
    );

    if (!joke) {
      return res.status(404).render('partials/message.hbs', {
        layout: false,
        error: true,
        message: 'No more jokes...'
      });
    }

    const photo = await db.oneOrNone(
      `SELECT profile_photo_url FROM users WHERE username = $1`,
      [joke.author]
    );

    const filterOn  = req.session.user?.profanity_filter ?? true;
    const displayed = filterOn
      ? (joke.censored_content || joke.content)   
      : joke.content;

    res.render('partials/post.hbs', {
      layout:         false,
      jokeID:         joke.id,
      username:       joke.author,
      profilePicture: photo?.profile_photo_url,
      timestamp:      timeAgo(joke.timestamp), 
      content:        displayed,
      hasProfanity:   joke.censored_content !== joke.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.post('/loadLeaderboardElement', async (req,res) => {
  try {
    const data = req.body;
    const elementsLoaded = data.elementsLoaded;

    const queryUserInfo = `SELECT * FROM users ORDER BY username ASC LIMIT 1 OFFSET ${elementsLoaded};`;
    const user = await db.oneOrNone(queryUserInfo);
    res.render('partials/user.hbs', {
      layout: false,
      username: user.username,
      profilePicture: user.profile_photo_url
    });
  } catch (err) {
    res.status(500).send("Error");
  }
});

app.get('/getJokeCount', async (req,res) => {
  try {
    const jokeCount = `SELECT Count(*) FROM jokes;`;
    const count = await db.one(jokeCount)
    res.send(count);
  } catch (err) {
    res.status(500).send("Error");
  }
});

app.get('/getAccountCount', async (req,res) => {
  try {
    const accountCount = `SELECT Count(*) FROM users;`;
    const count = await db.one(accountCount)
    res.send(count);
  } catch (err) {
    res.status(500).send("Error");
  }
});

// *****************************************************
// Section 5: Start Server
// *****************************************************

module.exports = app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});