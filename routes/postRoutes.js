/**
 * routes/postRoutes.js
 * CRUD posts + réactions temps réel + vues
 */
const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/* ── GET tous les posts (public) ── */
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

/* ── GET un post par ID ── */
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── POST incrémenter les vues ── */
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });

    const io = req.app.get('io');
    if (io) io.to(`post_${req.params.id}`).emit('view_update', { postId: req.params.id, views: post.views });

    res.json({ views: post.views });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── POST réaction (temps réel) ── */
router.post('/:id/react', async (req, res) => {
  const { emoji, uid } = req.body;
  if (!emoji || !uid) return res.status(400).json({ message: 'Données manquantes.' });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });

    if (!post.reactions) post.reactions = {};
    if (!post.reactors) post.reactors = {};

    const userKey = `${uid}_${emoji}`;
    const hasReacted = post.reactors[userKey] || false;

    if (hasReacted) {
      post.reactions[emoji] = Math.max(0, (post.reactions[emoji] || 0) - 1);
      post.reactors[userKey] = false;
    } else {
      post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
      post.reactors[userKey] = true;
    }

    await post.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`post_${req.params.id}`).emit('reaction_update', {
        postId: req.params.id,
        reactions: post.reactions,
        emoji,
        uid,
        reacted: !hasReacted
      });
    }

    res.json({ reactions: post.reactions, reacted: !hasReacted });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── POST créer un post ── */
router.post('/', protect, async (req, res) => {
  try {
    const { title, author, category, summary, content, publishedAt } = req.body;

    const post = await Post.create({
      title,
      author,
      authorId: req.admin.uid,
      authorEmail: req.admin.email,
      authorAvatar: req.admin.avatar || null,
      category,
      summary,
      content,
      publishedAt: publishedAt || new Date()
    });

    const io = req.app.get('io');
    if (io) io.emit('post_published', { post });

    res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── PUT modifier un post ── */
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });
    if (post.authorId !== req.admin.uid) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres posts.' });
    }

    const { title, author, category, summary, content, publishedAt } = req.body;
    const updated = await Post.findByIdAndUpdate(
      req.params.id,
      { title, author, category, summary, content, publishedAt },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── DELETE supprimer un post + commentaires ── */
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable.' });
    if (post.authorId !== req.admin.uid) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres posts.' });
    }

    await Comment.deleteMany({ postId: req.params.id });
    await Post.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) io.emit('post_deleted', { postId: req.params.id });

    res.json({ message: 'Post et commentaires supprimés.', id: req.params.id });
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
