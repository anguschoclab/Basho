/**
 * matchmaking.ts
 * ==============
 * Decomposed into src/engine/matchmaking/ directory.
 * This file is a backward-compatible barrel re-export so that all existing
 * import paths ("./matchmaking") continue to resolve without changes.
 *
 * See:
 *   matchmaking/MatchmakingPhases.ts — scoring, candidate pairs, types
 *   matchmaking/SwissAlgorithm.ts   — JSA Swiss torikumi system
 */

export * from './matchmaking/index';
