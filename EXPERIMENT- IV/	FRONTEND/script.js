const API_BASE = '/tasks'; const elements = {
form: document.getElementById('todoForm'), title: document.getElementById('todoTitle'),
description: document.getElementById('todoDescription'), priority: document.getElementById('todoPriority'),
list: document.getElementById('todos'),
empty: document.getElementById('emptyState'),
filterButtons: Array.from(document.querySelectorAll('.filter')), completedCount: document.getElementById('completedCount'), totalCount: document.getElementById('totalCount'),
search: document.getElementById('searchInput'), sort: document.getElementById('sortSelect'),
};

let tasks = [];
let currentFilter = 'all';

function normalizePriority(priority) { const valid = ['Low', 'Medium', 'High'];
return valid.includes(priority) ? priority : 'Medium';
}

function createTaskElement(task) { const li = document.createElement('li');
li.className = `todo-item ${task.priority.toLowerCase()}`;

const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
checkbox.checked = !!task.isDone;
checkbox.addEventListener('change', () => toggleDone(task.id, checkbox.checked));

const title = document.createElement('div'); title.className = 'task-title';

const label = document.createElement('label'); label.textContent = task.title;
if (task.isDone) { label.classList.add('completed');
}

const badge = document.createElement('span'); badge.className = 'badge';
badge.textContent = task.priority;

title.appendChild(label); title.appendChild(badge);

if (task.description) {
const desc = document.createElement('p'); desc.className = 'task-desc'; desc.textContent = task.description; title.appendChild(desc);
}

const controls = document.createElement('div'); controls.className = 'task-actions';

const editBtn = document.createElement('button'); editBtn.type = 'button';
editBtn.textContent = 'Edit'; editBtn.addEventListener('click', () => startEditTask(task));
 
const deleteBtn = document.createElement('button'); deleteBtn.type = 'button';
deleteBtn.textContent = 'Delete'; deleteBtn.addEventListener('click', () => deleteTask(task.id));

controls.appendChild(editBtn); controls.appendChild(deleteBtn);

const details = document.createElement('div'); details.className = 'details'; details.appendChild(checkbox); details.appendChild(title);

li.appendChild(details); li.appendChild(controls);

return li;
}

function applyFilters(inputTasks) {
const searchTerm = elements.search.value.trim().toLowerCase(); const filtered = inputTasks.filter((task) => {
if (currentFilter === 'active' && task.isDone) return false;
if (currentFilter === 'completed' && !task.isDone) return false; if (!searchTerm) return true;
return task.title.toLowerCase().includes(searchTerm) || (task.description || '').toLowerCase().includes(searchTerm);
});

if (elements.sort.value === 'priority') {
const priorityOrder = { High: 0, Medium: 1, Low: 2 };
filtered.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
}

return filtered;
}

function updateCounts() { const total = tasks.length;
const completed = tasks.filter((t) => t.isDone).length; elements.totalCount.textContent = total; elements.completedCount.textContent = completed;
}

function renderTasks() {
const visible = applyFilters(tasks); elements.list.innerHTML = '';

if (!visible.length) { elements.empty.style.display = 'block'; return;
}

elements.empty.style.display = 'none';

visible.forEach((task) => { elements.list.appendChild(createTaskElement(task));
});
}

async function loadTasks() { try {
const res = await fetch(API_BASE); tasks = await res.json(); updateCounts();
renderTasks();
} catch (err) { console.error(err);
}
}

async function createTask(payload) { try {
const res = await fetch(API_BASE, { method: 'POST',
headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});
if (!res.ok) throw new Error('Failed to create task'); await loadTasks();
 
} catch (err) { console.error(err);
}
}

async function updateTask(id, payload) { try {
const res = await fetch(`${API_BASE}/${id}`, { method: 'PUT',
headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});
if (!res.ok) throw new Error('Failed to update task'); await loadTasks();
} catch (err) { console.error(err);
}
}

async function toggleDone(id, isDone) { try {
const res = await fetch(`${API_BASE}/${id}/status`, { method: 'PATCH',
headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDone }),
});
if (!res.ok) throw new Error('Failed to update status'); await loadTasks();
} catch (err) { console.error(err);
}
}

async function deleteTask(id) { try {
const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Failed to delete task');
await loadTasks();
} catch (err) { console.error(err);
}
}

function clearForm() { elements.title.value = ''; elements.description.value = ''; elements.priority.value = 'Medium';
}

function startEditTask(task) {
const title = prompt('Edit task title', task.title); if (title === null) return;
const description = prompt('Edit task description (optional)', task.description || ''); if (description === null) return;
const priority = prompt('Edit priority (Low / Medium / High)', task.priority); if (priority === null) return;

updateTask(task.id, {
title: title.trim().slice(0, 50), description: description.trim(),
priority: normalizePriority(priority.trim()),
});
}

function setFilter(filter) { currentFilter = filter;
elements.filterButtons.forEach((btn) => { btn.classList.toggle('active', btn.dataset.filter === filter);
});
renderTasks();
}

function initEventHandlers() { elements.form.addEventListener('submit', (event) => { event.preventDefault();

const title = elements.title.value.trim();
const description = elements.description.value.trim(); const priority = normalizePriority(elements.priority.value);
 
if (!title) return;

createTask({ title, description, priority }); clearForm();
});

elements.filterButtons.forEach((button) => { button.addEventListener('click', () => setFilter(button.dataset.filter));
});

elements.search.addEventListener('input', () => renderTasks()); elements.sort.addEventListener('change', () => renderTasks());
}

function init() { initEventHandlers(); loadTasks();
}

init();
