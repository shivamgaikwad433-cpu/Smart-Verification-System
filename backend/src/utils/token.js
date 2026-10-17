const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const SECRET = process.env.JWT_SECRET || 'changeme_secret';

function signAccess(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { userId: user.id },
    SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signAccess, signRefresh, verifyToken };
