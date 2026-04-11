/**
 * routes/profileRoutes.js
 */
const express = require('express');
const Profile = require('../models/Profile');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().select('-__v');
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.params.username.toLowerCase() });
    if (!profile) return res.status(404).json({ message: 'Profil introuvable.' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/me', protect, async (req, res) => {
  const {
    firstName, pseudo, bio, quote, avatar,
    nationality, origin, dreamCountry,
    passions, links, username,
    displayMode  // 'firstName' | 'pseudo' | 'both'
  } = req.body;

  try {
    const profileUsername = (username || req.admin.username).toLowerCase();
    const profile = await Profile.findOneAndUpdate(
      { username: profileUsername },
      {
        firstName, pseudo, bio, quote, avatar,
        nationality, origin, dreamCountry,
        passions, links, displayMode,
        username: profileUsername
      },
      { new: true, upsert: true, runValidators: false }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
