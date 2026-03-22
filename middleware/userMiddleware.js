/**
 * middleware/userMiddleware.js
 * Middleware pour les utilisateurs connectés (pas forcément admin).
 * Vérifie le token Firebase et extrait les infos utilisateur.
 */

function decodeFirebaseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { return null; }
}

const protectUser = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Connecte-toi pour commenter.' });

  const decoded = decodeFirebaseToken(token);
  if (!decoded?.email) return res.status(401).json({ message: 'Token invalide.' });
  if (decoded.exp && decoded.exp < Date.now() / 1000) {
    return res.status(401).json({ message: 'Session expirée.' });
  }

  req.user = {
    email: decoded.email,
    name:  decoded.name || decoded.email.split('@')[0],
    uid:   decoded.user_id || decoded.sub,
  };
  next();
};

module.exports = { protectUser };
