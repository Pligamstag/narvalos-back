/**
 * routes/commentRoutes.js
 * Commentaires + réponses + likes + suppression
 */
const express = require('express');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/* ── GET tous les commentaires d'un post ── */
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId, parentId: null })
      .sort({ createdAt: -1 })
      .lean();

    // Charger les réponses pour chaque commentaire
    for (let comment of comments) {
      comment.replies = await Comment.find({ parentId: comment._id }).sort({ createdAt: 1 }).lean();
    }

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Erreur chargement commentaires.' });
  }
});

/* ── POST créer un commentaire ── */
router.post('/:postId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Contenu requis.' });

    const comment = await Comment.create({
      postId: req.params.postId,
      content,
      author: req.admin.name || req.admin.email.split('@')[0],
      authorId: req.admin.uid,
      authorAvatar: req.admin.avatar || null,
      parentId: null
    });

    const populated = await Comment.findById(comment._id).lean();

    const io = req.app.get('io');
    if (io) {
      io.to(`post_${req.params.postId}`).emit('comment_added', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ message: 'Erreur création commentaire.' });
  }
});

/* ── POST répondre à un commentaire ── */
router.post('/:commentId/reply', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const parentComment = await Comment.findById(req.params.commentId);
    if (!parentComment) return res.status(404).json({ message: 'Commentaire parent introuvable.' });

    const reply = await Comment.create({
      postId: parentComment.postId,
      content,
      author: req.admin.name || req.admin.email.split('@')[0],
      authorId: req.admin.uid,
      authorAvatar: req.admin.avatar || null,
      parentId: req.params.commentId
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`post_${parentComment.postId}`).emit('reply_added', {
        commentId: req.params.commentId,
        reply
      });
    }

    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ message: 'Erreur création réponse.' });
  }
});

/* ── POST liker un commentaire ── */
router.post('/:commentId/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable.' });

    if (!comment.likedBy) comment.likedBy = [];

    const hasLiked = comment.likedBy.includes(req.admin.uid);
    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(id => id !== req.admin.uid);
      comment.likes = Math.max(0, (comment.likes || 0) - 1);
    } else {
      comment.likedBy.push(req.admin.uid);
      comment.likes = (comment.likes || 0) + 1;
    }

    await comment.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`post_${comment.postId}`).emit('comment_liked', {
        commentId: req.params.commentId,
        likes: comment.likes,
        uid: req.admin.uid,
        liked: !hasLiked
      });
    }

    res.json({ likes: comment.likes, liked: !hasLiked });
  } catch (err) {
    res.status(500).json({ message: 'Erreur like.' });
  }
});

/* ── DELETE supprimer un commentaire (admin ou auteur) ── */
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable.' });

    if (comment.authorId !== req.admin.uid && !req.admin.isSuperAdmin) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    // Supprimer aussi les réponses
    await Comment.deleteMany({ parentId: req.params.commentId });
    await Comment.findByIdAndDelete(req.params.commentId);

    const io = req.app.get('io');
    if (io) {
      io.to(`post_${comment.postId}`).emit('comment_deleted', { commentId: req.params.commentId });
    }

    res.json({ message: 'Commentaire supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression.' });
  }
});

module.exports = router;
