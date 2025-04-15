const express = require('express');
const { check } = require('express-validator');
const {
  registerUser,
  loginUser,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('email', 'Bitte geben Sie eine gültige E-Mail-Adresse an').isEmail(),
    check('password', 'Bitte geben Sie ein Passwort mit 6 oder mehr Zeichen ein').isLength({ min: 6 })
  ],
  registerUser
);

router.post(
  '/login',
  [
    check('email', 'Bitte geben Sie eine gültige E-Mail-Adresse an').isEmail(),
    check('password', 'Passwort ist erforderlich').exists()
  ],
  loginUser
);

router.get('/me', protect, getMe);

router.put('/me', protect, updateDetails);

router.put(
  '/updatepassword',
  [
    check('currentPassword', 'Aktuelles Passwort ist erforderlich').not().isEmpty(),
    check('newPassword', 'Bitte geben Sie ein Passwort mit 6 oder mehr Zeichen ein').isLength({ min: 6 })
  ],
  protect,
  updatePassword
);

module.exports = router;