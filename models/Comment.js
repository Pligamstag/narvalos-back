/**
 * models/Comment.js
 * Modèle Mongoose pour les commentaires.
 */

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  postId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  author:    { type: String, required: true, trim: true },   // Prénom ou pseudo
  email:     { type: String, required: true, trim: true },   // Email (non affiché)
  uid:       { type: String, required: true },               // Firebase UID
  content:   { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

CommentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
