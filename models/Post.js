/**
 * models/Post.js
 */
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  author:      { type: String, required: true, trim: true },
  category:    { type: String, required: true, enum: ['anecdote','poeme','journee','autre'] },
  summary:     { type: String, required: true, trim: true, maxlength: 300 },
  content:     { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views:       { type: Number, default: 0 },
  reactions:   { type: Map, of: Number, default: {} },
}, { timestamps: true, versionKey: false });

PostSchema.index({ publishedAt: -1 });
PostSchema.index({ category: 1 });

module.exports = mongoose.model('Post', PostSchema);
