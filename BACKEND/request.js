const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: "Let's collaborate on a project!" },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
