const User = require('../models/User');
const bcrypt = require('bcrypt');


//Mock bcrypt and user
//it replicates a database or api soo that we could see if it works with a dummy before the real thing
jest.mock('bycrpt');
jest.mock('../models/User');

//path to register
const registerRoute = require('../routes/authRoutes');


//helper function
//Mimics store user registration info
//body stores inputs like emails and password (stimulates req.body)
// session : stimulate req.session , fake session authentication
function mockRequest(body){
     return{
        body, 
        session :{}, // fake req.session object
     };
}

function mockResponse(){
    const res: {};
    res.redirect = jest.fn();
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn();const User = require('../models/User');
const bcrypt = require('bcrypt');
const authRoutes = require('../routes/authRoutes');

// Mock bcrypt and User model
jest.mock('bcrypt');
jest.mock('../models/User');

// --- Helpers ---
// imitates the request from user inputs
function mockRequest(body = {}) {
  return {
    body,
    session: {}, // fake session
    query : {}
  };
}

//---Helper---
//Imitates response function
function mockResponse() {
  const res = {};
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Extract handler from router
function getRoute(router, path, method) {
  return router.stack
    .filter(r => r.route && r.route.path === path && r.route.methods[method])
    .map(r => r.route.stack[0].handle)[0];
}

// --- Tests ---
describe("Auth Routes", () => {

  const registerHandler = getRoute(authRoutes, "/register", "post");
  const loginHandler = getRoute(authRoutes, "/login", "post");

    //--------------------------------------------------------------------------------------------------------
  // ----------------------
  // REGISTER TESTS
  // ----------------------
  
  //Only Email was placed
  test("Register - missing required fields", async () => {
    const req = mockRequest({ email: "a@gmail.com" });
    const res = mockResponse();

    await registerHandler(req, res); // next ignored
    expect(res.redirect).toHaveBeenCalledWith("/register?error=Missing required user information");
  });

  //All input except firstname 
  test("Register - first name missing", async () => {
    const req = mockRequest({ firstName: "" });
    const res = mockResponse();

    await registerHandler(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/register?error=Missing required user information");
  });

  //All input except lastname
  test("Register - last name missing", async () => {
    const req = mockRequest({ lastName: "" });
    const res = mockResponse();

    await registerHandler(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/register?error=Missing required user information");
  });
  
  // email exist within the database already
  test("Register - email already exists", async () => {
    User.findOne.mockResolvedValue({ email: "a@gmail.com" });

    const req = mockRequest({
      firstName: "Angelo",
      lastName: "T",
      birthdate: "2000-01-01",
      gender: "Male",
      email: "a@gmail.com",
      phoneNumber: "12345",
      password: "pass"
    });
    const res = mockResponse();

    await registerHandler(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/register?error=Email already in use");
  });

  //successful registration
  test("Register - successful", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashedpass");
    User.prototype.save = jest.fn().mockResolvedValue();

    const req = mockRequest({
      firstName: "A",
      lastName: "B",
      birthdate: "2000-01-01",
      gender: "Male",
      email: "a@gmail.com",
      phoneNumber: "123",
      password: "pass"
    });
    const res = mockResponse();

    await registerHandler(req, res);
    expect(req.session.newUser).toBeDefined();
    expect(res.redirect).toHaveBeenCalledWith("/");
  });
  //--------------------------------------------------------------------------------------------------------

  //--------------------------------------------------------------------------------------------------------
  // ----------------------
  // LOGIN TESTS
  // ----------------------
  
  // login with only email
   test("Login - no pass", async () => {
    User.findOne.mockResolvedValue(null);
    const req = mockRequest({ email: "a@gmail.com", password: "" });
    const res = mockResponse();

    await loginHandler(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login?error=Enter password');

  });
  
   // login with only password
  test("Login - no email", async () => {
    User.findOne.mockResolvedValue(null);
    const req = mockRequest({ email: "", password: "pass" });
    const res = mockResponse();

    await loginHandler(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login?error=Enter email');

  });

  //no user found in the database
  test("Login - user not found", async () => {
    const req = mockRequest({ email: "a@gmail.com", password: "pass" });
    User.findOne.mockResolvedValue(null);
    const res = mockResponse();

    await loginHandler(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/login?error=User Not Found");
  });


  //Incorrect password
  test("Login - incorrect password", async () => {
    User.findOne.mockResolvedValue({ email: "a@gmail.com", password: "x" });
    bcrypt.compare.mockResolvedValue(false);

    const req = mockRequest({ email: "a@gmail.com", password: "pass" });
    const res = mockResponse();

    await loginHandler(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/login?error=Incorrect password");
  });


  // siccessful login
  test("Login - successful", async () => {
    User.findOne.mockResolvedValue({
      _id: "123",
      firstName: "Test",
      role: "user",
      password: "hashedpass"
    });
    bcrypt.compare.mockResolvedValue(true);

    const req = mockRequest({ email: "a@gmail.com", password: "pass" });
    const res = mockResponse();

    await loginHandler(req, res, () => {});
    expect(req.session.user).toBeDefined();
    expect(req.session.user.id).toBe("123");
    expect(res.redirect).toHaveBeenCalledWith("/");
  });

  //--------------------------------------------------------------------------------------------------------
});
