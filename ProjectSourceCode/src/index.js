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

// *****************************************************
// Section 4: Routes
// *****************************************************

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

app.post('/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    await db.none(
      'INSERT INTO users(username, password) VALUES($1, $2)',
      [req.body.username, hash]
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

// Login POST
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

// Logout
app.get('/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);  // log possible error
      return res.redirect('/home');  // stay on the home page (could also display fail message)
    }
    res.render('pages/login', {  // sends you to login upon logout
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
  res.render('pages/leaderboard')
  
})

app.get('/feed', (req,res) => {
  res.render('pages/feed')
  
})

// *****************************************************
// Section 5: Start Server
// *****************************************************

app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});