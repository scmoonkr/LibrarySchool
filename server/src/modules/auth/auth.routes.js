import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import {
  changeMyPassword,
  checkNickname,
  forgotPassword,
  kakaoAuthorize,
  kakaoCallback,
  loginLocal,
  logoutAuth,
  me,
  refreshAuth,
  resetPasswordByToken,
  signupLocal,
} from './auth.controller.js';

const router = Router();

router.get('/nickname-check', checkNickname);
router.post('/signup', signupLocal);
router.post('/login', loginLocal);
router.post('/refresh', refreshAuth);
router.post('/logout', logoutAuth);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changeMyPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordByToken);
router.get('/kakao/authorize', kakaoAuthorize);
router.get('/kakao/callback', kakaoCallback);

export default router;
