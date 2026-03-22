/**
 * routes/commentRoutes.js
 * GET  /api/comments/:postId     — liste des commentaires
 * POST /api/comments/:postId     — ajouter un commentaire (connecté)
 * DELETE /api/comments/:id       — supprimer (admin seulement)
 */

const express = require('express');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');
const { protectUser } = require('../middleware/userMiddleware');

const router = express.Router();

/* ── GET commentaires d'un post ── */
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .select('-email');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── POST ajouter un commentaire (utilisateur connecté) ── */
router.post('/:postId', protectUser, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ message: 'Le commentaire ne peut pas être vide.' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ message: 'Commentaire trop long (1000 caractères max).' });
  }
  try {
    const comment = await Comment.create({
      postId:  req.params.postId,
      author:  req.user.name,
      email:   req.user.email,
      uid:     req.user.uid,
      content: content.trim(),
    });
    const safe = { ...comment.toObject() };
    delete safe.email;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ── DELETE supprimer un commentaire (admin) ── */
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable.' });
    res.json({ message: 'Commentaire supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
