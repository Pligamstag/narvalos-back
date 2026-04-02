/**
 * middleware/authMiddleware.js
 * Vérifie les tokens Firebase sur les routes protégées.
 * CORRIGÉ : username toujours tiré de l'email (partie avant @), jamais du displayName
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
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' });
  }

  const decoded = decodeFirebaseToken(token);

  if (!decoded?.email) {
    return res.status(401).json({ message: 'Token invalide.' });
  }

  // Vérifier expiration
  if (decoded.exp && decoded.exp < Date.now() / 1000) {
    return res.status(401).json({ message: 'Session expirée. Reconnecte-toi.' });
  }

  const email = decoded.email.toLowerCase();

  if (!ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ message: "Accès refusé. Tu n'es pas admin." });
  }

  req.admin = {
    email: decoded.email,
    // ✅ CORRECTION : toujours utiliser la partie avant @ de l'email comme username
    // decoded.name = displayName Firebase ("Samy Foot") → MAUVAIS
    // email.split('@')[0] = "samyfoot51" → BON
    username: email.split('@')[0],
    uid: decoded.user_id || decoded.sub,
  };

  next();
};

module.exports = { protect };
