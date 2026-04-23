const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /api/notifications — fetch all notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('notifications')
      .populate('notifications.from', 'name');

    const notifs = (user.notifications || [])
      .slice()
      .reverse()
      .slice(0, 50); // latest 50

    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count — lightweight poll endpoint
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    const count = (user.notifications || []).filter(n => !n.read).length;
    const latest = (user.notifications || [])
      .filter(n => !n.read)
      .slice(-5)
      .reverse()
      .map(n => ({ _id: n._id, message: n.message, type: n.type, createdAt: n.createdAt }));
    res.json({ count, latest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'notifications.$[].read': true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { _id: req.user.id, 'notifications._id': req.params.id },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id — delete one notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { notifications: { _id: req.params.id } }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications — clear all
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $set: { notifications: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
