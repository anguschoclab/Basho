/**
 * Auto-Sim and Observer Mode System
 * 
 * This module delegates to specialized services for:
 * 1. Time-Advancement Loop (AutoSimService)
 * 2. High-Speed Tournament Resolution (TournamentSimulator)
 * 3. Historical Record Keeping (ChronicleService)
 */

export * from './simulation/AutoSimService';
export * from './simulation/TournamentSimulator';
export * from './simulation/ChronicleService';

// Re-export types from centralized location
export * from './types/records';
export * from './types/basho';
