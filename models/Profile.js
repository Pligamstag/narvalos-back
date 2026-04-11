/**
 * models/Profile.js
 */
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  firstName:   { type: String, trim: true, default: '' },
  pseudo:      { type: String, trim: true, default: '' },
  avatar:      { type: String, default: '' },
  quote:       { type: String, default: '' },
  bio:         { type: String, default: '' },
  nationality: { type: String, default: '' },
  origin:      { type: String, default: '' },
  dreamCountry:{ type: String, default: '' },
  passions:    [String],
  displayMode: { type: String, default: 'firstName', enum: ['firstName', 'pseudo', 'both'] },
  links: {
    instagram: { type: String, default: '' },
    spotify:   { type: String, default: '' },
    twitter:   { type: String, default: '' },
    youtube:   { type: String, default: '' },
    tiktok:    { type: String, default: '' },
    other:     { type: String, default: '' },
  },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Profile', ProfileSchema);
