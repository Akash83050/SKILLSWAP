const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, bio, skills_have, skills_want } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio, skills_have, skills_want },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for discovery/matching)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { skill, search } = req.query;
    let query = { _id: { $ne: req.user.id } };
    
    if (skill) {
      query['skills_have.name'] = { $regex: skill, $options: 'i' };
    }
    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { 'skills_have.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query).select('-password').limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get best matches for current user
router.get('/matches', authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const wantedSkills = me.skills_want.map(s => s.name);
    const mySkills = me.skills_have.map(s => s.name);
    
    // Find users who have skills I want
    const matches = await User.find({
      _id: { $ne: req.user.id },
      'skills_have.name': { $in: wantedSkills }
    }).select('-password').limit(20);
    
    // Score matches
    const scored = matches.map(user => {
      const theirSkills = user.skills_have.map(s => s.name);
      const matchScore = theirSkills.filter(s => 
        wantedSkills.some(w => w.toLowerCase() === s.toLowerCase())
      ).length;
      const reverseMatch = (user.skills_want || []).map(s => s.name).filter(s =>
        mySkills.some(m => m.toLowerCase() === s.toLowerCase())
      ).length;
      return { user, score: matchScore + reverseMatch };
    });
    
    scored.sort((a, b) => b.score - a.score);
    res.json(scored.map(s => ({ ...s.user.toObject(), matchScore: s.score })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate a user
router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { rating } = req.body;
    const user = await User.findById(req.params.id);
    const newCount = user.rating_count + 1;
    const newRating = ((user.rating * user.rating_count) + rating) / newCount;
    user.rating = Math.round(newRating * 10) / 10;
    user.rating_count = newCount;
    await user.save();
    res.json({ rating: user.rating, rating_count: user.rating_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications as read
router.put('/me/notifications/read', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'notifications.$[].read': true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
