const router = require('express').Router();
const Request = require('../models/Request');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Send collaboration request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { to, message, project } = req.body;
    
    const existing = await Request.findOne({ from: req.user.id, to, status: 'pending' });
    if (existing) return res.status(400).json({ error: 'Request already sent' });
    
    const request = await Request.create({ 
      from: req.user.id, to, message, project 
    });
    
    const fromUser = await User.findById(req.user.id);
    await User.findByIdAndUpdate(to, {
      $push: { notifications: {
        message: `${fromUser.name} wants to collaborate with you!`,
        type: 'request', from: req.user.id
      }}
    });
    
    await request.populate('from', 'name avatar skills_have');
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my requests (received)
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({ to: req.user.id })
      .populate('from', 'name avatar bio skills_have skills_want rating')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sent requests
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({ from: req.user.id })
      .populate('to', 'name avatar skills_have')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept/Reject request
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.to.toString() !== req.user.id) 
      return res.status(403).json({ error: 'Not authorized' });
    
    request.status = status;
    await request.save();
    
    const toUser = await User.findById(req.user.id);
    const msg = status === 'accepted' 
      ? `${toUser.name} accepted your collaboration request! 🎉`
      : `${toUser.name} declined your collaboration request.`;
    
    await User.findByIdAndUpdate(request.from, {
      $push: { notifications: { message: msg, type: 'request', from: req.user.id }}
    });
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
