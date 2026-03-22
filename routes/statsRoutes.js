/**
 * routes/statsRoutes.js
 * Stats globales du blog
 */
const express = require('express');
const Post    = require('../models/Post');
const Comment = require('../models/Comment');
const router  = express.Router();

router.get('/', async (req, res) => {
  try {
    const [totalPosts, totalComments] = await Promise.all([
      Post.countDocuments(),
      Comment.countDocuments(),
    ]);

    // Réactions totales par emoji (stockées en localStorage côté client, pas en DB)
    // On retourne juste les stats disponibles en DB

    res.json({
      totalPosts,
      totalComments,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
