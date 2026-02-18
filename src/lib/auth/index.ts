// Auth configuration
export { authOptions, createUser, userExists } from './auth.config';

// Auth guard helpers
export {
  requireAuth,
  getAuthUserId,
  getAuthUser,
  type AuthResult,
} from './require-auth';
