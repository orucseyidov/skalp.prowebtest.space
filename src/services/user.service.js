const { createHttpError } = require('../utils/httpErrors');
const repo = require('../repositories/user.repository');
const { sanitizeCreate, sanitizeUpdate } = require('../models/user.model');

exports.list = async ({ page = 1, limit = 10 }) => {
  return repo.findAll({ page, limit });
};

exports.get = async (id) => {
  const user = await repo.findById(id);
  if (!user) throw createHttpError(404, 'User not found');
  return user;
};

exports.create = async (payload) => {
  const data = sanitizeCreate(payload);
  // unique email check
  const all = await repo.findAll({ page: 1, limit: 100000 });
  if (all.items.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw createHttpError(409, 'Email already in use');
  }
  return repo.create(data);
};

exports.update = async (id, payload) => {
  const existing = await repo.findById(id);
  if (!existing) throw createHttpError(404, 'User not found');
  const data = sanitizeUpdate(payload);
  if (data.email && data.email !== existing.email) {
    const all = await repo.findAll({ page: 1, limit: 100000 });
    if (all.items.find((u) => u.email.toLowerCase() === data.email.toLowerCase() && String(u.id) !== String(id))) {
      throw createHttpError(409, 'Email already in use');
    }
  }
  return repo.update(id, data);
};

exports.remove = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw createHttpError(404, 'User not found');
  await repo.remove(id);
  return true;
};


