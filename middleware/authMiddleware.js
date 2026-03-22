/**
 * middleware/authMiddleware.js
 * Vérifie les tokens Firebase sur les routes protégées.
 */

const ADMIN_EMAILS = [
  'samyfoot51@gmail.com',
  'vyrdox@gmail.com',
  'lulummix30@kitoy.me',
  'zaynebdeschassagnes@gmail.com',
];

function decodeFirebaseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { return null; }
}

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Non autorisé.' });

  const decoded = decodeFirebaseToken(token);
  if (!decoded?.email) return res.status(401).json({ message: 'Token invalide.' });
  if (decoded.exp && decoded.exp < Date.now() / 1000) {
    return res.status(401).json({ message: 'Session expirée.' });
  }

  const email = decoded.email.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  req.admin = {
    email:    decoded.email,
    username: decoded.name || email.split('@')[0],
    uid:      decoded.user_id || decoded.sub,
  };
  next();
};

module.exports = { protect };
