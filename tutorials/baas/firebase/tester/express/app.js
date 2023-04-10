const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const { getAuth } = require("firebase/auth");

const auth = getAuth();

// pass the session to the connect sqlite3 module
// allowing it to inherit from session.Store

// var indexRouter = require('./routes/index');
var authRouter = require("./routes/auth");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// app.locals.pluralize = require('pluralize');

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  var user = auth.currentUser;
  console.log('>>', user)
  res.locals.currentUser = user;
  next();
});

// app.use('/', indexRouter);
app.use("/", authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
