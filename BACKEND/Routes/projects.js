const router = require('express').Router();
const Project = require('../models/Project');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { skill, status, search } = req.query;
    let query = {};
    if (skill) query.required_skills = { $regex: skill, $options: 'i' };
    if (status) query.status = status;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const projects = await Project.find(query)
      .populate('owner', 'name avatar skills_have')
      .populate('members', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, required_skills, category } = req.body;
    const project = await Project.create({
      title, description, required_skills, category,
      owner: req.user.id,
      members: [req.user.id]
    });
    await project.populate('owner', 'name avatar skills_have');
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name avatar bio skills_have rating')
      .populate('members', 'name avatar skills_have');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join project
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.members.includes(req.user.id)) 
      return res.status(400).json({ error: 'Already a member' });
    project.members.push(req.user.id);
    await project.save();
    
    // Notify owner
    await User.findByIdAndUpdate(project.owner, {
      $push: { notifications: {
        message: `Someone joined your project: ${project.title}`,
        type: 'project', from: req.user.id
      }}
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project status
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.owner.toString() !== req.user.id) 
      return res.status(403).json({ error: 'Not authorized' });
    
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('owner', 'name avatar skills_have')
      .populate('members', 'name avatar');
    
    if (req.body.status === 'completed') {
      await User.updateMany(
        { _id: { $in: project.members } },
        { $inc: { completed_projects: 1 } }
      );
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get showcase projects
router.get('/public/showcase', async (req, res) => {
  try {
    const projects = await Project.find({ status: 'completed' })
      .populate('owner', 'name avatar')
      .populate('members', 'name avatar')
      .sort({ updatedAt: -1 }).limit(20);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
