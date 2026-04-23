const path = require('path');
const express = require('express'); const cors = require('cors');
const sqlite3 = require('sqlite3'); const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); app.use(express.json());

// Serve frontend files
app.use(express.static(path.join( dirname, '..', 'frontend'))); let db;
async function initDb() { db = await open({
filename: path.join( dirname, 'db.sqlite'), driver: sqlite3.Database,
});

await db.run(`
CREATE TABLE IF NOT EXISTS tasks (
id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
description TEXT,
priority TEXT NOT NULL DEFAULT 'Medium', isDone INTEGER NOT NULL DEFAULT 0,
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);
}

app.get('/tasks', async (req, res) => { try {
const tasks = await db.all('SELECT * FROM tasks ORDER BY createdAt DESC'); res.json(tasks);
} catch (err) { console.error(err);
res.status(500).json({ error: 'Failed to load tasks' });
}
});

app.post('/tasks', async (req, res) => { try {
const { title, description = '', priority = 'Medium' } = req.body; if (!title || !title.trim()) {
return res.status(400).json({ error: 'Title is required' });
}
 
const cleanedTitle = title.trim().slice(0, 50);
const cleanedPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';

const result = await db.run(
'INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)', cleanedTitle,
description || '', cleanedPriority,
);

const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID); res.status(201).json(task);
} catch (err) { console.error(err);
res.status(500).json({ error: 'Failed to create task' });
}
});

app.put('/tasks/:id', async (req, res) => { try {
const { id } = req.params;
const { title, description, priority } = req.body;

const existing = await db.get('SELECT * FROM tasks WHERE id = ?', id); if (!existing) {
return res.status(404).json({ error: 'Task not found' });
}

const updatedTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 50) : existing.title; const updatedDescription = typeof description === 'string' ? description : existing.description; const updatedPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : existing.priority;

await db.run(
'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?', updatedTitle,
updatedDescription, updatedPriority,
id,
);

const task = await db.get('SELECT * FROM tasks WHERE id = ?', id); res.json(task);
} catch (err) { console.error(err);
res.status(500).json({ error: 'Failed to update task' });
}
});

app.patch('/tasks/:id/status', async (req, res) => { try {
const { id } = req.params; const { isDone } = req.body;

const existing = await db.get('SELECT * FROM tasks WHERE id = ?', id); if (!existing) {
return res.status(404).json({ error: 'Task not found' });
}

const newStatus = typeof isDone === 'boolean' ? (isDone ? 1 : 0) : (existing.isDone ? 0 : 1); await db.run('UPDATE tasks SET isDone = ? WHERE id = ?', newStatus, id);
const task = await db.get('SELECT * FROM tasks WHERE id = ?', id); res.json(task);
} catch (err) { console.error(err);
res.status(500).json({ error: 'Failed to update task status' });
}
});

app.delete('/tasks/:id', async (req, res) => { try {
const { id } = req.params;
await db.run('DELETE FROM tasks WHERE id = ?', id); res.status(204).send();
} catch (err) { console.error(err);
res.status(500).json({ error: 'Failed to delete task' });
}
});
 
app.get('*', (req, res) => {
res.sendFile(path.join(  dirname, '..', 'frontend', 'index.html'));
});

initDb()
.then(() => { app.listen(PORT, () => {
console.log(`Server listening on http://localhost:${PORT}`);
});
})
.catch((err) => {
console.error('Failed to start server', err); process.exit(1);
});


