// backend/routes/userRoutes.js (vollständig)
const express = require('express');
const { check } = require('express-validator');
const {
  registerUser,
  loginUser,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  inviteUser,
  activateAccount,
  uploadProfileImage,
  reinviteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Öffentliche Routen
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

router.post(
  '/forgotpassword',
  [
    check('email', 'Bitte geben Sie eine gültige E-Mail-Adresse an').isEmail()
  ],
  forgotPassword
);

router.put(
  '/resetpassword/:resettoken',
  [
    check('password', 'Bitte geben Sie ein Passwort mit 6 oder mehr Zeichen ein').isLength({ min: 6 })
  ],
  resetPassword
);

router.put(
  '/activate/:activationtoken',
  [
    check('password', 'Bitte geben Sie ein Passwort mit 6 oder mehr Zeichen ein').isLength({ min: 6 })
  ],
  activateAccount
);

// Geschützte Routen - nur für angemeldete Benutzer
router.get('/me', protect, getMe);

router.put('/me', protect, updateDetails);

router.put(
  '/updatepassword',
  [
    protect,
    check('currentPassword', 'Aktuelles Passwort ist erforderlich').not().isEmpty(),
    check('newPassword', 'Bitte geben Sie ein Passwort mit 6 oder mehr Zeichen ein').isLength({ min: 6 })
  ],
  updatePassword
);

// Profilbild-Upload-Route
router.post('/upload-profile-image', protect, uploadProfileImage);

// Admin-Routen
router.route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(
    protect, 
    authorize('admin'),
    [
      check('name', 'Name ist erforderlich').not().isEmpty(),
      check('email', 'Bitte geben Sie eine gültige E-Mail-Adresse an').isEmail(),
      check('role', 'Rolle ist ungültig').optional().isIn(['user', 'admin', 'manager'])
    ],
    inviteUser
  );

router.route('/:id')
  .get(protect, authorize('admin'), getUser)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

// Route für erneute Einladung
router.post(
  '/:id/reinvite',
  protect, 
  authorize('admin'),
  reinviteUser
);

module.exports = router;