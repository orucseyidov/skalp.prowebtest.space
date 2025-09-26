const Joi = require('joi');

const idSchema = Joi.object({ id: Joi.string().required() });

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const createSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
}).min(1);

function sanitizeCreate(payload) {
  const { name, email, password } = payload;
  return { name: String(name).trim(), email: String(email).trim(), password: String(password) };
}

function sanitizeUpdate(payload) {
  const out = {};
  if (payload.name != null) out.name = String(payload.name).trim();
  if (payload.email != null) out.email = String(payload.email).trim();
  if (payload.password != null) out.password = String(payload.password);
  return out;
}

module.exports = {
  idSchema,
  paginationSchema,
  createSchema,
  updateSchema,
  sanitizeCreate,
  sanitizeUpdate,
};


