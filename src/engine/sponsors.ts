/**
 * Sponsors System Entry Point
 * 
 * This module delegates to specialized services for:
 * 1. Procedural Generation (SponsorGenerator)
 * 2. Prize Allocation (KenshoService)
 * 3. Relationship Management (SponsorshipService)
 * 4. Data Structures (types/sponsors)
 */

export * from './systems/generation/SponsorGenerator';
export * from './systems/economics/KenshoService';
export * from './systems/economics/SponsorshipService';

// Re-export types from centralized location
export * from './types/sponsors';