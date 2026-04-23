const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get conversations list
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    }).sort({ createdAt: -1 });
    
    const convMap = {};
    messages.forEach(msg => {
      if (!convMap[msg.conversation]) convMap[msg.conversation] = msg;
    });
    
    const convs = Object.values(convMap);
    const populated = await Promise.all(convs.map(async msg => {
      const otherId = msg.sender.toString() === req.user.id ? msg.receiver : msg.sender;
      const other = await User.findById(otherId).select('name avatar skills_have');
      const unread = await Message.countDocuments({ 
        conversation: msg.conversation, receiver: req.user.id, read: false 
      });
      return { conversationId: msg.conversation, other, lastMessage: msg.text, 
               lastTime: msg.createdAt, unread };
    }));
    
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a conversation
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const ids = [req.user.id, req.params.userId].sort().join('_');
    const messages = await Message.find({ conversation: ids })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });
    
    // Mark as read
    await Message.updateMany(
      { conversation: ids, receiver: req.user.id, read: false },
      { read: true }
    );
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const ids = [req.user.id, req.params.userId].sort().join('_');
    
    const message = await Message.create({
      conversation: ids,
      sender: req.user.id,
      receiver: req.params.userId,
      text
    });
    
    const sender = await User.findById(req.user.id);
    await User.findByIdAndUpdate(req.params.userId, {
      $push: { notifications: {
        message: `New message from ${sender.name}: ${text.substring(0, 50)}`,
        type: 'message', from: req.user.id
      }}
    });
    
    await message.populate('sender', 'name avatar');
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
