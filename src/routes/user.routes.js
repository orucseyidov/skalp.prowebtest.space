const express = require('express');
const controller = require('../controllers/user.controller');
const validate = require('../middlewares/validate.middleware');
const { createSchema, updateSchema, paginationSchema, idSchema } = require('../models/user.model');

const router = express.Router();

router.get('/', validate(paginationSchema, 'query'), controller.list);
router.get('/:id', validate(idSchema, 'params'), controller.get);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(idSchema, 'params'), validate(updateSchema), controller.update);
router.delete('/:id', validate(idSchema, 'params'), controller.remove);

module.exports = router;

