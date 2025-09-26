const { randomUUID } = require('crypto');

/** In-memory users store with seed */
const users = [
  { id: randomUUID(), name: 'Alice', email: 'alice@example.com', createdAt: new Date().toISOString() },
  { id: randomUUID(), name: 'Bob', email: 'bob@example.com', createdAt: new Date().toISOString() },
];

exports.findAll = async ({ page = 1, limit = 10 }) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 10);
  const start = (p - 1) * l;
  const items = users.slice(start, start + l);
  return { items, total: users.length, page: p, limit: l };
};

exports.findById = async (id) => users.find((u) => String(u.id) === String(id)) || null;

exports.create = async (data) => {
  const user = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
};

exports.update = async (id, data) => {
  const idx = users.findIndex((u) => String(u.id) === String(id));
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  return users[idx];
};

exports.remove = async (id) => {
  const idx = users.findIndex((u) => String(u.id) === String(id));
  if (idx === -1) return;
  users.splice(idx, 1);
};


