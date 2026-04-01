/**
 * routes/commentRoutes.js
 * Commentaires style TikTok — likes, réponses, suppression en cascade
 */
const express = require('express');
const Comment = require('../models/Comment');
const Post    = require('../models/Post');
const { protect } = require('../middleware/authMiddleware');
const { protectUser } = require('../middleware/userMiddleware');

const router = express.Router();

/* ── GET commentaires d'un post ── */
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .select('-email -replies.email');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── POST ajouter un commentaire ── */
router.post('/:postId', protectUser, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'Commentaire vide.' });
  if (content.length > 1000) return res.status(400).json({ message: 'Trop long (1000 max).' });

  try {
    const comment = await Comment.create({
      postId:  req.params.postId,
      author:  req.user.name,
      email:   req.user.email,
      uid:     req.user.uid,
      content: content.trim(),
    });

    // Broadcast WebSocket
    const io = req.app.get('io');
    if (io) {
      const safe = comment.toObject();
      delete safe.email;
      io.to('post_' + req.params.postId).emit('comment_added', safe);
    }

    const safe = comment.toObject();
    delete safe.email;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── POST liker un commentaire ── */
router.post('/:id/like', protectUser, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Introuvable.' });

    const uid    = req.user.uid;
    const liked  = comment.likedBy.includes(uid);

    if (liked) {
      comment.likedBy.pull(uid);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(uid);
      comment.likes++;
    }
    await comment.save();

    // Broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('post_' + comment.postId).emit('comment_liked', {
        commentId: comment._id, likes: comment.likes, liked: !liked, uid
      });
    }

    res.json({ likes: comment.likes, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── POST ajouter une réponse ── */
router.post('/:id/reply', protectUser, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'Réponse vide.' });

  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable.' });

    const reply = {
      author:  req.user.name,
      email:   req.user.email,
      uid:     req.user.uid,
      content: content.trim(),
    };

    comment.replies.push(reply);
    await comment.save();

    const saved = comment.replies[comment.replies.length - 1].toObject();
    delete saved.email;

    // Broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('post_' + comment.postId).emit('reply_added', {
        commentId: comment._id, reply: saved
      });
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── DELETE supprimer un commentaire (admin) ── */
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Introuvable.' });
    res.json({ message: 'Supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

/* ── DELETE supprimer tous les commentaires d'un post (cascade) ── */
router.delete('/post/:postId', protect, async (req, res) => {
  try {
    await Comment.deleteMany({ postId: req.params.postId });
    res.json({ message: 'Commentaires supprimés.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

module.exports = router;
