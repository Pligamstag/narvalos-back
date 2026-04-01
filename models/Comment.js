/**
 * models/Comment.js
 * Commentaires avec likes et réponses
 */
const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  author:    { type: String, required: true },
  email:     { type: String, required: true },
  uid:       { type: String, required: true },
  content:   { type: String, required: true, maxlength: 500 },
  likes:     { type: Number, default: 0 },
  likedBy:   [String], // UIDs
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

const CommentSchema = new mongoose.Schema({
  postId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  author:    { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true },
  uid:       { type: String, required: true },
  content:   { type: String, required: true, trim: true, maxlength: 1000 },
  likes:     { type: Number, default: 0 },
  likedBy:   [String], // UIDs
  replies:   [ReplySchema],
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

CommentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
