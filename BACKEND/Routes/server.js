const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/skillswap')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SkillSwap running on http://localhost:${PORT}`));
