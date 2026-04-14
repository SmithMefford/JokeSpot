// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** UNIT TESTCASES **************************
// --- Registration Testing Suite ---
describe('Testing Registration API', () => {
    // POSITIVE will ONLY pass if you clear volumes first (needs to add a NEW user)
  it('positive : /register adds new user and redirects to /home with 302 status code', done => {
    chai
      .request(server)
      .post('/register')
      .redirects(0)
      .send({username: 'the_real_admin', password: '$2a$10$E.Nq8oyJqsqC45g.38Rkj.Wvgya2p1PBH/LM4F1scBxXgbTrRlASG'})
      .end((err, res) => {
        expect(res).to.have.status(302); // redirection status code
        // expect(res.body.message).to.equals('Success');  // no json body, redirects instead
        res.should.redirectTo('/home');
        done();
      });
  });

  // NEGATIVE: duplicate user
  it('Negative : /register. Checking duplicate user', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 'user0', password : 'imagine_this_is_a_hashed_password'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        // expect(res.body.message).to.equals('Duplicate user');
        res.should.be.html;  // sends back to register page
        expect(res.text).to.include('That account already exists!');  // error message
        done();
      });
  });

  // NEGATIVE: invalid input data
  it('Negative : /register. Checking invalid username', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 67, password : 'unhackable_password'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        // expect(res.body.message).to.equals('Invalid input');
        res.should.be.html;  // should render pages/register
        done();
      });
  });
});

// --- Login Testing Suite ---
describe('Testing LoginI', () => {
  // Positive: login to test user
  it('positive: /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'the_real_admin', password: '$2a$10$E.Nq8oyJqsqC45g.38Rkj.Wvgya2p1PBH/LM4F1scBxXgbTrRlASG'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
  // Negative: account doesn't exist
  it('negative: /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: '', password: 'a'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});

// --- Page Render Testing Suite ---
describe('Testing Render', () => {
  // Login page
  it('test "/login" route should render with an html response', done => {
    chai
      .request(server)
      .get('/login') // for reference, see lab 8's login route (/login) which renders home.hbs
      .end((err, res) => {
        res.should.have.status(200); // Expecting a success status code
        res.should.be.html; // Expecting a HTML response
        done();
      });
  });

});