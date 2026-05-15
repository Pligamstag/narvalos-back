/**
 * models/Post.js
 * Avec vues, réactions par emoji et réacteurs (pour éviter double réaction)
 */
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  authorEmail: { type: String },  // ← AJOUTE
  authorId: { type: String },      // ← AJOUTE
  category: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  reactions: { type: Object, default: {} },
  reactors: { type: Object, default: {} }
}, { timestamps: true });

PostSchema.index({ publishedAt: -1 });
PostSchema.index({ category: 1 });

module.exports = mongoose.model('Post', PostSchema);
