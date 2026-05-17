/**
 * routes/postRoutes.js
 * CRUD posts + suppression en cascade + vues uniques
 */
const express = require('express');
const Post    = require('../models/Post');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/* ── GET tous les posts ── */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, sort = '-publishedAt' } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    filter.publishedAt = { $lte: new Date() };

    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-content');

    res.json({ posts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── GET un post par ID + incrémenter les vues ── */
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── POST incrémenter les vues (vue unique par session) ── */
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });

    // Broadcast views via WebSocket
    const io = req.app.get('io');
    if (io) io.to('post_' + req.params.id).emit('view_update', { postId: req.params.id, views: post.views });

    res.json({ views: post.views });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── POST ajouter/retirer une réaction ── */
router.post('/:id/react', async (req, res) => {
  const { emoji, uid } = req.body;
  if (!emoji || !uid) return res.status(400).json({ message: 'Données manquantes.' });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });

    const reactions    = post.reactions || new Map();
    const reactors     = post.reactors  || new Map();
    const userKey      = uid + '_' + emoji;
    const hasReacted   = (reactors.get ? reactors.get(userKey) : reactors[userKey]) || false;

    if (hasReacted) {
      const count = Math.max(0, (reactions.get ? reactions.get(emoji) : reactions[emoji] || 0) - 1);
      post.reactions.set(emoji, count);
      post.reactors.set(userKey, false);
    } else {
      const count = (reactions.get ? reactions.get(emoji) : reactions[emoji] || 0) + 1;
      post.reactions.set(emoji, count);
      post.reactors.set(userKey, true);
    }

    await post.save();

    const reactionsObj = {};
    post.reactions.forEach((v, k) => { reactionsObj[k] = v; });

    // Broadcast réactions via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('post_' + req.params.id).emit('reaction_update', {
        postId: req.params.id,
        reactions: reactionsObj,
        emoji, uid, reacted: !hasReacted
      });
      io.emit('reaction_update_global', { postId: req.params.id, reactions: reactionsObj });
    }

    res.json({ reactions: reactionsObj, reacted: !hasReacted });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── POST créer un post ── */
router.post('/', protect, async (req, res) => {
  try {
    const { title, author, category, summary, content, publishedAt } = req.body;
    if (!title || !author || !category || !summary || !content) {
      return res.status(400).json({ message: 'Champs obligatoires manquants.' });
    }
    const post = await Post.create({ title, author, category, summary, content, publishedAt });

    // Broadcast nouveau post
    const io = req.app.get('io');
    if (io) io.emit('post_published', { post });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.', error: err.message });
  }
});

/* ── PUT modifier un post ── */
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, author, category, summary, content, publishedAt } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { title, author, category, summary, content, publishedAt },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── DELETE supprimer un post + ses commentaires (cascade) ── */
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }
    
    // 🔒 Vérification : seul l'auteur peut supprimer
    if (post.authorId !== req.user.uid) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres textes.' });
    }
    
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post supprimé avec succès.', id: req.params.id });
    
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
    // Suppression en cascade des commentaires
    await Comment.deleteMany({ postId: req.params.id });

    // Broadcast suppression
    const io = req.app.get('io');
    if (io) io.emit('post_deleted', { postId: req.params.id });

    res.json({ message: 'Post et commentaires supprimés.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
