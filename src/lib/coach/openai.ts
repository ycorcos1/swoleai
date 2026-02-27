/**
 * Shared OpenAI client for the SwoleAI coach system.
 *
 * Instantiated once at module load. The OPENAI_API_KEY env var is required
 * at runtime (server-side only). Next.js will throw at build time if the key
 * is missing when the module is imported in a server context.
 */

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Default model for coach endpoints */
export const COACH_MODEL = 'gpt-4o-mini' as const;
