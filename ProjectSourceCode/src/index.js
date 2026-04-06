const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/css', express.static(path.join(__dirname, 'resources', 'css')));
app.use('/js', express.static(path.join(__dirname, 'resources', 'js')));
app.use('/img', express.static(path.join(__dirname, 'resources', 'img')));

app.use(
  session({
    secret: 'temporary-secret',
    saveUninitialized: false,
    resave: false,
  })
);

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.error('Database connection error:', error.message || error);
  });

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

// Home page (protected)
app.get('/home', auth, (req, res) => {
  const jokes = [
    "My IQ test finally came back! My score was negative.",
    "A man walks into a bar and says, 'Ouch!'"
  ];

  res.render('pages/home', {
    user: req.session.user,
    message: 'Welcome to JokeSpot!',
    error: false,
    jokes
  });
});

// Register POST
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
    res.redirect('/home');
  } catch (error) {
    console.error(error);
    res.render('pages/register', {
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
      return res.render('pages/login', {
        message: 'No account found',
        error: true
      });
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return res.render('pages/login', {
        message: 'Incorrect username or password.',
        error: true
      });
    }

    req.session.user = user;
    req.session.save();
    res.redirect('/home');
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.get('/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.redirect('/home');
    }
    res.render('pages/login', {
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

app.get('/leaderboards', auth, (req,res) => {
  res.render('pages/leaderboard', { 
    user: req.session.user
  });
});

app.get('/feed', auth, (req,res) => {
  res.render('pages/feed', { 
    user: req.session.user
  });
});

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

app.get('/profile/edit', auth, async (req, res) => {
  try {
    const user = await db.one('SELECT * FROM users WHERE username = $1', [req.session.user.username]);
    res.render('pages/profile-edit', {
      user: user
    });
  } catch (error) {
    console.error(error);
    res.redirect('/profile');
  }
});

app.post('/profile/edit', auth, async (req, res) => {
  try {
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

app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});