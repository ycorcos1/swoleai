import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Zod schema for credentials validation
const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials
          const result = credentialsSchema.safeParse(credentials);
          if (!result.success) {
            console.log('[Auth] Credentials validation failed');
            return null;
          }

          const { email, password } = result.data;
          const normalizedEmail = email.toLowerCase().trim();

          // Check if user exists in database
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
          
          if (!user || !user.password) {
            console.log('[Auth] User not found or no password:', normalizedEmail);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.log('[Auth] Invalid password for user:', normalizedEmail);
            return null;
          }

          console.log('[Auth] Login successful for:', normalizedEmail);
          return {
            id: user.id,
            email: user.email,
          };
        } catch (error) {
          console.error('[Auth] Error in authorize:', error);
          return null;
        }
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
  debug: process.env.NODE_ENV === 'development',
};

// Helper function to create a new user (signup)
export async function createUser(email: string, password: string): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  
  if (existingUser) {
    return null;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Create user in database
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
    },
  });

  return { id: user.id, email: user.email };
}

// Helper to check if a user exists
export async function userExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return !!user;
}
