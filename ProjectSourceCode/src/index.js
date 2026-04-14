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
const multer = require('multer'); // For profile picture uploads

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

// Set up Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to the ignored pfp/ subdirectory to avoid cross-platform Git issues
    cb(null, path.join(__dirname, 'resources', 'img', 'pfp')); 
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
    secret: 'temporary-secret', // simplified for dev
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
  host: 'localhost',
  port: 5432,
  database: process.env.POSTGRES_DB || 'jokespot',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'pwd',
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
// Section 3: Middleware
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

// *****************************************************
// Section 4: Routes
// *****************************************************

// Dummy api to test that server.spec connects to index
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/home');
});

// Login page
app.get('/login', (req, res) => {
  res.render('pages/login');
});

// Register page
app.get('/register', (req, res) => {
  res.render('pages/register');
});

// Home page (protected)
app.get('/home', (req, res) => {
  const jokes = [
    "My IQ test finally came back! My score was negative.",
    "A man walks into a bar and says, 'Ouch!'"
  ];

  res.render('pages/home', {
    user: res.locals.user,
    message: 'Welcome to JokeSpot!',
    error: false,
    jokes   
  });
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

    await db.none(
      'INSERT INTO users(username, password, profile_photo_url) VALUES($1, $2, $3)',
      [req.body.username, hash, randomAvatar]
    );
    const user = await db.one(
      'SELECT * FROM users WHERE username = $1',
      [req.body.username]
    );
    req.session.user = user;
    req.session.save();
    return res.status(200).redirect('/home');
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
    res.status(200).render('pages/login', {  
      message: "Logged out successfully!",
      error: false
    });
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

// EDIT ROUTES MOVED TO THE TOP TO PREVENT EXPRESS ROUTING CONFLICTS
app.get('/profile/edit', auth, async (req, res) => {
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

app.post('/profile/edit', auth, upload.single('profile_picture'), async (req, res) => {
  try {
    const isPrivate = req.body.is_private === 'on';
    
    const currentUser = await db.one('SELECT profile_photo_url FROM users WHERE username = $1', [req.session.user.username]);
    let newPhotoUrl = currentUser.profile_photo_url;

    if (req.file) {
        // Path now includes /pfp/
        newPhotoUrl = '/img/pfp/' + req.file.filename;
    }

    await db.none(
      'UPDATE users SET profile_photo_url = $1, is_private = $2 WHERE username = $3',
      [newPhotoUrl, isPrivate, req.session.user.username]
    );
    
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.redirect('/profile/edit');
  }
});

// DYNAMIC PROFILE VIEW ROUTE MOVED TO THE BOTTOM
app.get('/profile/:username?', auth, async (req, res) => {
  try {
    const targetUsername = req.params.username || req.session.user.username;
    const isOwner = targetUsername === req.session.user.username;

    const profileUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [targetUsername]);

    if (!profileUser) {
      return res.redirect('/home');
    }

    const isPrivateView = profileUser.is_private && !isOwner;

    const average_rating = 4.5;
    const rank = 10;
    const rating_title = "Open Mic Rookie";

    res.render('pages/profile', {
      username: profileUser.username,
      profile_photo_url: profileUser.profile_photo_url,
      is_private_view: isPrivateView,
      is_owner: isOwner,
      average_rating,
      rank,
      rating_title
    });
  } catch (error) {
    console.error(error);
    res.redirect('/home');
  }
});

// *****************************************************
// Section 4.2: Interaction & Post Routes
// *****************************************************

app.get('/jokecreate', auth, (req,res) => {
  res.render('pages/jokecreate', {
    user: res.locals.user,
    message: 'post your joke!',
    error: false
  });
});

app.post('/create-joke', auth, async (req, res) => {
  try {
    const { jokeContent, tags } = req.body;
    await db.none('INSERT INTO jokes(author, content, tags) VALUES($1, $2, $3)', [
      req.session.user.username, jokeContent, tags || ''
    ]);
    res.redirect('/feed');
  } catch (error) {
    console.error(error);
    res.redirect('/jokecreate');
  }
});

app.get('/feed', auth, async (req, res) => {
  try {
    const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
    const tagFilter = req.query.tag ? req.query.tag.trim() : '';

    let query = `
      SELECT j.*, u.profile_photo_url
      FROM jokes j 
      JOIN users u ON j.author = u.username
    `;
    let queryParams = [];

    if (tagFilter) {  
      query += ` WHERE j.tags ILIKE $1`;
      queryParams.push(`%${tagFilter}%`);
    }

    query += ` ORDER BY j.timestamp ${sortOrder}`;

    const jokes = await db.any(query, queryParams);

    res.render('pages/feed', { 
      user: res.locals.user,
      jokes: jokes,
      currentSort: req.query.sort || 'newest',
      currentTag: tagFilter,
      error: false
    });
  } catch (err) {
    console.error("FEED ROUTE ERROR:", err);
    res.status(500).send("Database Error: " + err.message);
  }
});

app.get('/leaderboards', (req,res) => {
  res.render('pages/leaderboard', { 
    user: res.locals.user
  });
});

app.post('/rateJoke', (req,res) => {
  const rating = req.body.data;
  switch (rating) {
    case "upvote":
      console.log("the joke was upvoted");
      break;
    case "downvote":
      console.log("the joke was downvoted")
      break;
  }
});

app.post('/reportJoke', (req, res) => {
  try {
    console.log(req.body.data);
  } catch(err) {
    res.status(500).send("Failed to report joke");
  }
});

app.get('/loadJokes', async (req,res) => {
  try {
    res.render('partials/post.hbs', { layout: false });
  } catch (err) {
    res.status(500).send("Failed to load post")
  }
});

// *****************************************************
// Section 5: Start Server
// *****************************************************

module.exports = app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});