const service = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/users
 */
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const data = await service.list({ page: Number(page), limit: Number(limit) });
  res.json({ success: true, data });
});

/**
 * GET /api/users/:id
 */
exports.get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await service.get(id);
  res.json({ success: true, data });
});

/**
 * POST /api/users
 */
exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  res.status(201).json({ success: true, data });
});

/**
 * PUT /api/users/:id
 */
exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  res.json({ success: true, data });
});

/**
 * DELETE /api/users/:id
 */
exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.json({ success: true });
});


