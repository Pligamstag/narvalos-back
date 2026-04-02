/**
 * routes/profileRoutes.js
 * Ajout d'une route /seed pour créer les profils admin
 */

const express = require('express');
const Profile = require('../models/Profile');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ⭐ ROUTE TEMPORAIRE À AJOUTER (à supprimer après utilisation)
router.post('/seed', async (req, res) => {
  const adminEmails = [
    'samyfoot51@gmail.com',
    'vyrdox@gmail.com', 
    'lulummix30@kitoy.me',
    'zaynebdeschassagnes@gmail.com'
  ];
  
  const results = [];
  
  for (const email of adminEmails) {
    const username = email.split('@')[0].toLowerCase();
    const exists = await Profile.findOne({ username });
    
    if (!exists) {
      const profile = await Profile.create({
        username: username,
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        pseudo: username,
        quote: "Membre des Narvalos 🌀",
        passions: ["Narvalos", "Écriture"],
        links: {}
      });
      results.push({ username, status: 'créé', profile });
      console.log(`✅ Profil créé: ${username}`);
    } else {
      results.push({ username, status: 'existe déjà' });
    }
  }
  
  res.json({ message: 'Seed terminé', results });
});

// GET /api/profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().select('-__v');
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/profiles/:username
router.get('/:username', async (req, res) => {
  try {
    console.log('🔍 Recherche profil:', req.params.username);
    const profile = await Profile.findOne({ username: req.params.username.toLowerCase() });
    if (!profile) {
      console.log('❌ Profil non trouvé:', req.params.username);
      return res.status(404).json({ message: 'Profil introuvable.' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Erreur GET profil:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/profiles/me
router.put('/me', protect, async (req, res) => {
  const { firstName, pseudo, bio, quote, avatar, nationality, dreamCountry, passions, links, username } = req.body;
  
  try {
    // Utiliser le username de l'admin connecté ou celui fourni
    const profileUsername = username || req.admin.username;
    
    const profile = await Profile.findOneAndUpdate(
      { username: profileUsername.toLowerCase() },
      { firstName, pseudo, bio, quote, avatar, nationality, dreamCountry, passions, links, username: profileUsername.toLowerCase() },
      { new: true, upsert: true, runValidators: true }
    );
    
    console.log('✅ Profil sauvegardé:', profile.username);
    res.json(profile);
  } catch (err) {
    console.error('Erreur PUT profil:', err);
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
