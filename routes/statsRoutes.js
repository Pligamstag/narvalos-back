/**
 * routes/statsRoutes.js
 * Stats globales --- commentaires, membres Firebase, réactions
 */

const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const router = express.Router();

// Compteur online (partagé avec server.js via app)
router.get('/', async (req, res) => {
  try {
    const [totalPosts, totalComments] = await Promise.all([
      Post.countDocuments(),
      Comment.countDocuments(),
    ]);

    // Vues totales
    const postsData = await Post.find({}, 'views reactions');
    const totalViews = postsData.reduce((sum, p) => sum + (p.views || 0), 0);

    // Réactions agrégées
    const reactions = {};
    postsData.forEach(p => {
      if (p.reactions) {
        Object.entries(p.reactions).forEach(([emoji, count]) => {
          reactions[emoji] = (reactions[emoji] || 0) + count;
        });
      }
    });

    // Online count depuis app (CORRIGÉ)
    const onlineNow = req.app.get('onlineUsers') || 0;

    res.json({
      totalPosts,
      totalComments,
      totalViews,
      reactions,
      onlineNow,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Incrémenter les vues d'un post
router.post('/view/:postId', async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.postId, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Enregistrer une réaction
router.post('/reaction/:postId', async (req, res) => {
  const { emoji, value } = req.body; // value: 1 ou -1
  try {
    const update = {};
    update['reactions.' + emoji] = value || 1;
    await Post.findByIdAndUpdate(req.params.postId, { $inc: update });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

module.exports = router;
