const fs = require('fs');  // file system module
const path = require('path'); // contruct file path way


//Log Directories
//defines where the logs will be stored
const logDirUser = path.join(__dirname, '../logs/users');
const logDirAdmin = path.join(__dirname, '../logs/admin');
const logDirError = path.join(__dirname, '../logs/errors');


//if directories doesnt exist
//create them
[logDirUser, logDirAdmin, logDirError].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});


//the actual path where the log will be placed
const userLogPath = path.join(logDirUser, 'user.log');
const adminLogPath = path.join(logDirAdmin, 'admin.log');
const errorLogPath = path.join(logDirError, 'error.log');

// if they, log files dont exist
//create them
[userLogPath, adminLogPath, errorLogPath].forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '', { flag: 'wx' }); // creates empty file
    console.log(`Created missing log file: ${file}`);
  }
});

// function that would log user action
function logUserAction(req, res, next) {
  let logEntry;
  let logFile;

    //if user is log 
    // contain log in logEntry, determine the role if admin or customer, then place to the respective log
  if (req.session.user) {
    const { username, id, role } = req.session.user;
    logEntry = `[${new Date().toISOString()}] ${role.toUpperCase()} "${username}" (ID: ${id}) accessed ${req.method} ${req.originalUrl}\n`;
    logFile = role === 'admin' ? adminLogPath : userLogPath;
      //if user is unlogged , place in user.log but as ANONYMOUS
  } else {
    logEntry = `[${new Date().toISOString()}] ANONYMOUS accessed ${req.method} ${req.originalUrl}\n`;
    logFile = userLogPath;
  }

  //incase logging fails ( print in console )
  fs.appendFile(logFile, logEntry, err => {
    if (err) console.error(`Failed to write log:`, err);
  });

  next();
}

// function to log in error messages
function logError(err, req, res, next) {
    // log error here
  const logEntry = `[${new Date().toISOString()}] ERROR in ${req.method} ${req.originalUrl}: ${err.stack || err}\n`;

    //incase logging fails ( print in console )
  fs.appendFile(errorLogPath, logEntry, err => {
    if (err) console.error('Failed to write error log:', err);
  });

   // Send a simple JSON or text response to confirm
  res.status(500).json({ message: "Internal server error", error: err.message });
}


module.exports = { logUserAction, logError };





