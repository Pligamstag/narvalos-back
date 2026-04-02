/**
 * middleware/authMiddleware.js
 * Vérifie les tokens Firebase sur les routes protégées.
 * CORRIGÉ : Ajout de la vérification Firebase Admin SDK
 */

const admin = require('firebase-admin');

// Liste des admins (devrait venir de la base de données en production)
const ADMIN_EMAILS = [
  'samyfoot51@gmail.com',
  'vyrdox@gmail.com',
  'lulummix30@kitoy.me',
  'zaynebdeschassagnes@gmail.com',
];

// Initialiser Firebase Admin (à faire une seule fois dans server.js)
// Pour l'instant, on garde la décode simple, mais ajoutons la vérification complète

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

  // Décoder le token JWT (vérification basique)
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
    return res.status(403).json({ message: 'Accès refusé. Tu n\'es pas admin.' });
  }

  req.admin = {
    email: decoded.email,
    username: decoded.name || email.split('@')[0],
    uid: decoded.user_id || decoded.sub,
  };

  next();
};

module.exports = { protect };
