const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'secret_dev_key';

async function authMiddleware(req, res, next) {
  // First try new flow: token id passed in header `x-token-id`
  const tokenId = req.headers['x-token-id'] || req.headers['x_token_id'];
  if (tokenId) {
    try {
      const Token = require('../models/Token');
      const tokenDoc = await Token.findById(tokenId).lean();
      if (!tokenDoc) return res.status(401).json({ message: 'Invalid token id' });

      const token = tokenDoc.token;
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;
      req.tokenId = tokenId;
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  // Fallback to legacy Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'Invalid Authorization header' });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function permit(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (allowed.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  };
}

module.exports = { authMiddleware, permit };
