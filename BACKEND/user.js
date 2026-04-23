const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  skills_have: [{ 
    name: String, 
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'], default: 'Intermediate' }
  }],
  skills_want: [{ name: String }],
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  completed_projects: { type: Number, default: 0 },
  notifications: [{
    message: String,
    type: { type: String, enum: ['request', 'message', 'project', 'rating'] },
    read: { type: Boolean, default: false },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
