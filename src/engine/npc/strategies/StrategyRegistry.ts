/**
 * StrategyRegistry.ts
 *
 * Registry pattern for NPC strategy lookup and management.
 * Eliminates duplicate strategy patterns across finance, sponsor, governance, etc.
 */

import type { FinanceStrategy } from "./finance/FinanceStrategy";
import type { SponsorStrategy } from "./sponsor/SponsorStrategy";
import type { GovernanceStrategy } from "./governance/GovernanceStrategy";

/**
 * Strategy registry for managing all NPC strategies.
 */
class StrategyRegistry {
  private financeStrategies = new Map<string, FinanceStrategy>();
  private sponsorStrategies = new Map<string, SponsorStrategy>();
  private governanceStrategies = new Map<string, GovernanceStrategy>();

  /**
   * Register a finance strategy.
   * @param archetype - The oyakata archetype
   * @param strategy - The finance strategy
   */
  registerFinanceStrategy(archetype: string, strategy: FinanceStrategy): void {
    this.financeStrategies.set(archetype, strategy);
  }

  /**
   * Get a finance strategy by archetype.
   * @param archetype - The oyakata archetype
   * @returns The finance strategy or undefined
   */
  getFinanceStrategy(archetype: string): FinanceStrategy | undefined {
    return this.financeStrategies.get(archetype);
  }

  /**
   * Get a finance strategy with a fallback to default.
   * @param archetype - The oyakata archetype
   * @returns The finance strategy
   */
  getFinanceStrategyOrThrow(archetype: string): FinanceStrategy {
    const strategy = this.financeStrategies.get(archetype);
    if (!strategy) {
      throw new Error(`No finance strategy found for archetype: ${archetype}`);
    }
    return strategy;
  }

  /**
   * Register a sponsor strategy.
   * @param archetype - The oyakata archetype
   * @param strategy - The sponsor strategy
   */
  registerSponsorStrategy(archetype: string, strategy: SponsorStrategy): void {
    this.sponsorStrategies.set(archetype, strategy);
  }

  /**
   * Get a sponsor strategy by archetype.
   * @param archetype - The oyakata archetype
   * @returns The sponsor strategy or undefined
   */
  getSponsorStrategy(archetype: string): SponsorStrategy | undefined {
    return this.sponsorStrategies.get(archetype);
  }

  /**
   * Get a sponsor strategy with a fallback to default.
   * @param archetype - The oyakata archetype
   * @returns The sponsor strategy
   */
  getSponsorStrategyOrThrow(archetype: string): SponsorStrategy {
    const strategy = this.sponsorStrategies.get(archetype);
    if (!strategy) {
      throw new Error(`No sponsor strategy found for archetype: ${archetype}`);
    }
    return strategy;
  }

  /**
   * Register a governance strategy.
   * @param archetype - The oyakata archetype
   * @param strategy - The governance strategy
   */
  registerGovernanceStrategy(archetype: string, strategy: GovernanceStrategy): void {
    this.governanceStrategies.set(archetype, strategy);
  }

  /**
   * Get a governance strategy by archetype.
   * @param archetype - The oyakata archetype
   * @returns The governance strategy or undefined
   */
  getGovernanceStrategy(archetype: string): GovernanceStrategy | undefined {
    return this.governanceStrategies.get(archetype);
  }

  /**
   * Get a governance strategy with a fallback to default.
   * @param archetype - The oyakata archetype
   * @returns The governance strategy
   */
  getGovernanceStrategyOrThrow(archetype: string): GovernanceStrategy {
    const strategy = this.governanceStrategies.get(archetype);
    if (!strategy) {
      throw new Error(`No governance strategy found for archetype: ${archetype}`);
    }
    return strategy;
  }

  /**
   * Get all registered finance strategies.
   * @returns Map of archetype to finance strategy
   */
  getAllFinanceStrategies(): Map<string, FinanceStrategy> {
    return new Map(this.financeStrategies);
  }

  /**
   * Get all registered sponsor strategies.
   * @returns Map of archetype to sponsor strategy
   */
  getAllSponsorStrategies(): Map<string, SponsorStrategy> {
    return new Map(this.sponsorStrategies);
  }

  /**
   * Get all registered governance strategies.
   * @returns Map of archetype to governance strategy
   */
  getAllGovernanceStrategies(): Map<string, GovernanceStrategy> {
    return new Map(this.governanceStrategies);
  }

  /**
   * Clear all registered strategies.
   */
  clear(): void {
    this.financeStrategies.clear();
    this.sponsorStrategies.clear();
    this.governanceStrategies.clear();
  }
}

// Singleton instance
export const strategyRegistry = new StrategyRegistry();
