/**
 * Rules Engine — Phase 7
 *
 * Deterministic logic for substitution, progression, PR detection,
 * volume tracking, plateau detection, and deload recommendations.
 *
 * All functions are pure (no DB access) and importable from both
 * server routes and client components.
 */

export * from './types';
export * from './substitution';
export * from './progression';
export * from './pr-detection';
export * from './volume';
export * from './plateau';
export * from './deload';
