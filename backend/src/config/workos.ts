import { WorkOS } from '@workos-inc/node';
import dotenv from 'dotenv';

dotenv.config();

// Initialize WorkOS client
export const workos = new WorkOS(process.env.WORKOS_API_KEY);

// WorkOS configuration
export const workosConfig = {
  clientId: process.env.WORKOS_CLIENT_ID!,
  redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
  
  // OAuth provider configurations
  providers: {
    google: 'GoogleOAuth',
    facebook: 'FacebookOAuth',
  },
  
  // Connection types
  connectionTypes: ['GoogleOAuth', 'FacebookOAuth'],
};

// Validate required environment variables
if (!process.env.WORKOS_API_KEY) {
  throw new Error('WORKOS_API_KEY environment variable is required');
}

if (!process.env.WORKOS_CLIENT_ID) {
  throw new Error('WORKOS_CLIENT_ID environment variable is required');
}

export default workos;