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

// Session setup
app.use(
  session({
    secret: 'temporary-secret', // simplified for dev
    saveUninitialized: false,
    resave: false,
  })
);

// Database config
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
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
  //array of jokes that can be coded from the database for joke of the day
  const jokes = [
    "My IQ test finally came back! My score was negative.",
    "A man walks into a bar and says, 'Ouch!'"
  ];
  //"Another man walks into a bar and says, 'Why did they put this here?'"

  res.render('pages/home', {
    user: req.session.user,
    message: 'Welcome to JokeSpot!',
    error: false,
    jokes   // <-- pass jokes array to Handlebars
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
      user: req.session.user,
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
    
    // Randomly assign a default profile picture upon registration
    const defaultAvatars = [
      '/img/default_profile_1.png',
      '/img/default_profile_2.png',
      '/img/default_profile_3.png',
      '/img/default_profile_4.png',
      '/img/default_profile_5.png'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    // Updated insert statement to include profile_photo_url
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
    // console.error(error);  // removed bc makes tests hard to see
    res.status(400).render('pages/register', {
      message: 'That account already exists!',
      error: true
    });
  }
});

// Login POST
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
    //console.error(error);
    res.status(400).redirect('/login');
  }
});

// Logout
app.get('/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);  // log possible error
      return res.status(400).redirect('/home');  // stay on the home page (could also display fail message)
    }
    res.status(200).render('pages/login', {  // sends you to login upon logout
      message: "Logged out successfully!",
      error: false
    });
  });
});

app.get('/settings', auth, (req,res) => {
  res.render('pages/settings', {
    user: req.session.user,
    message: 'Welcome to JokeSpot settings!',
    error: false
  });
});

app.get('/jokecreate', auth, (req,res) => {
  res.render('pages/jokecreate', {
    user: req.session.user,
    message: 'post your joke!',
    error: false
  });
});

app.get('/leaderboards', (req,res) => {
  res.render('pages/leaderboard', { 
    user: req.session.user
  });
});

app.get('/feed', auth, (req,res) => {
  try {
    res.render('pages/feed', { 
      user: req.session.user,
      error: false
    });
  } catch (err) {
    res.redirect('/login');
  }
});

// *****************************************************
// Section 4.1: Profile Routes
// *****************************************************

// Profile page (Dynamic based on username parameter)
app.get('/profile/:username?', auth, async (req, res) => {
  try {
    // Determine if user is viewing their own profile or someone else's
    const targetUsername = req.params.username || req.session.user.username;
    const isOwner = targetUsername === req.session.user.username;

    // Fetch user data from the database
    const profileUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [targetUsername]);

    if (!profileUser) {
      return res.redirect('/home');
    }

    // Hide stats if the account is private and the viewer is not the owner
    const isPrivateView = profileUser.is_private && !isOwner;

    // Placeholder stats (To be updated with real database queries later)
    const average_rating = 4.5;
    const rank = 10;
    const rating_title = "Open Mic Rookie";

    res.render('pages/profile', {
      display_name: profileUser.display_name || profileUser.username,
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

// Profile Edit page (GET)
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

// Profile Edit page (POST) - Updates database
app.post('/profile/edit', auth, async (req, res) => {
  try {
    // Checkboxes send 'on' if checked, map this to a boolean
    const isPrivate = req.body.is_private === 'on';
    
    await db.none(
      'UPDATE users SET display_name = $1, profile_photo_url = $2, is_private = $3 WHERE username = $4',
      [req.body.display_name, req.body.profile_photo_url, isPrivate, req.session.user.username]
    );
    
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.redirect('/profile/edit');
  }
});

// *****************************************************
// Section 4.2: Interaction & Post Routes
// *****************************************************

// Once the joke creation backend is implemented, we can replace the console logs with the actual data inserts.
app.post('/rateJoke', (req,res) => {
  const rating = req.body.data;
  console.log(rating)
  switch (rating) {
    case "upvote":
      console.log("the joke was upvoted");
      break;
    case "downvote":
      console.log("the joke was downvoted")
      break;
    default:
      console.log("broken")
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

// Prepares the partial and then sends it to the client to be inserted dynamically
// Later, we can modify this to retrieve data from the DB, populate the post partial,
// then send it back to the client.
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