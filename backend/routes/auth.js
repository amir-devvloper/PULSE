import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
    signupHandler, loginHandler, logoutHandler, meHandler,
    updateMeHandler, changePasswordHandler, deleteAccountHandler,
    forgotPasswordHandler, resetPasswordHandler
} from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/signup', signupHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.put('/me', requireAuth, updateMeHandler);
authRouter.delete('/me', requireAuth, deleteAccountHandler);
authRouter.put('/password', requireAuth, changePasswordHandler);

// Tighter limits: these send email / guess tokens.
authRouter.post('/forgot', rateLimit({ max: 5 }), forgotPasswordHandler);
authRouter.post('/reset', rateLimit({ max: 10 }), resetPasswordHandler);
