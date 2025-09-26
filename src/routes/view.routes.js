const router = require('express').Router();

router.get('/', (req, res) => res.render('pages/home', { title: 'Anasayfa' }));
router.get('/test', (req, res) => res.render('pages/test', { title: 'Skalp Test Səhifəsi' }));

module.exports = router;

