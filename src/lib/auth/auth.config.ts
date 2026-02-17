import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Zod schema for credentials validation
const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// In-memory user store for development
// This will be replaced with Prisma DB in Task 2.x
const users: Map<string, { id: string; email: string; passwordHash: string }> = new Map();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials
        const result = credentialsSchema.safeParse(credentials);
        if (!result.success) {
          return null;
        }

        const { email, password } = result.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const user = users.get(normalizedEmail);
        if (!user) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    newUser: '/signup',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to create a new user (signup)
export async function createUser(email: string, password: string): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user already exists
  if (users.has(normalizedEmail)) {
    return null;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Create user with unique ID
  const id = crypto.randomUUID();
  const user = { id, email: normalizedEmail, passwordHash };
  users.set(normalizedEmail, user);

  return { id, email: normalizedEmail };
}

// Helper to check if a user exists
export function userExists(email: string): boolean {
  return users.has(email.toLowerCase().trim());
}
