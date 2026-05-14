const express = require('express');
const Profile = require('../models/Profile');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json(await Profile.find().select('-__v'));
  } catch { res.status(500).json({ message: 'Erreur.' }); }
});

router.get('/:username', async (req, res) => {
  try {
    const p = await Profile.findOne({ username: req.params.username.toLowerCase() });
    if (!p) return res.status(404).json({ message: 'Introuvable.' });
    res.json(p);
  } catch { res.status(500).json({ message: 'Erreur.' }); }
});

router.put('/me', protect, async (req, res) => {
  const {
    firstName, pseudo, bio, quote, avatar,
    nationality, origin, dreamCountry,
    passions, links, username,
    displayMode, showFirstName
  } = req.body;
  try {
    const uname = (username || req.admin.username).toLowerCase();
    const p = await Profile.findOneAndUpdate(
      { username: uname },
      { firstName, pseudo, bio, quote, avatar, nationality, origin, dreamCountry, passions, links, displayMode, showFirstName, username: uname },
      { new: true, upsert: true, runValidators: false }
    );
    res.json(p);
  } catch { res.status(500).json({ message: 'Erreur.' }); }
});

router.delete('/:username', protect, async (req, res) => {
  try {
    const deleted = await Profile.findOneAndDelete({ username: req.params.username.toLowerCase() });
    if (!deleted) return res.status(404).json({ message: 'Profil introuvable.' });
    res.json({ message: `Profil "${req.params.username}" supprime.` });
  } catch { res.status(500).json({ message: 'Erreur.' }); }
});


module.exports = router;
