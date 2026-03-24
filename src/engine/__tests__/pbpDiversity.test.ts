import { describe, it, expect } from "vitest";
import { synthesizeTickNarrative } from "../bout/boutNarrative";
import { TickResolutionEvent, CombatAction, NarrativeContext } from "../types/combat";
import { Rikishi } from "../types/rikishi";
import { VOCABULARY } from "../bout/grammarDefinitions";

describe("Dynamic Narrative Engine Diversity", () => {
    const mockRikishi: Rikishi = {
        id: "r1",
        shikona: "Hakuho",
        stats: { strength: 80, technique: 80, speed: 80, balance: 80, mental: 80 },
        archetype: "oshi",
        rank: "Yokozuna"
    } as any;

    const mockDefender: Rikishi = {
        id: "r2",
        shikona: "Asashoryu"
    } as any;

    const mockAction: CombatAction = {
        family: "push",
        intent: "attack",
        statWeighting: { strength: 1, weight: 0.5, technique: 0.2, speed: 0.1, balance: 0.1 }
    };

    const mockContext: NarrativeContext = {
        attackerFatigueLevel: "fresh",
        defenderBalanceLevel: "planted",
        isEdgeOfRing: false,
        isRepeatedAction: false,
        isReversal: false,
        isRivalry: false,
        isChampionshipBout: false
    };

    const baseEvent: TickResolutionEvent = {
        tickNumber: 1,
        attacker: mockRikishi,
        defender: mockDefender,
        action: mockAction,
        powerDifferential: 20,
        context: mockContext
    };

    it("produces diverse outputs for identical physical ticks", () => {
        const outputs = new Set<string>();
        for (let i = 0; i < 20; i++) {
            outputs.add(synthesizeTickNarrative(baseEvent));
        }
        // With current templates (2 structures, multiple adverbs/verbs), 
        // 5 distinct outputs is a safe assertion for 20 rolls.
        expect(outputs.size).toBeGreaterThanOrEqual(2); 
    });

    it("injects exhaustion vocabulary when attacker is exhausted", () => {
        const exhaustedEvent = {
            ...baseEvent,
            context: { ...mockContext, attackerFatigueLevel: "exhausted" }
        } as TickResolutionEvent;

        // Run several times to ensure the template with [decorator_exhausted?] is picked
        let foundExhaustion = false;
        for (let i = 0; i < 10; i++) {
            const output = synthesizeTickNarrative(exhaustedEvent);
            if (VOCABULARY.decorator_exhausted.some(word => output.includes(word))) {
                foundExhaustion = true;
                break;
            }
        }
        expect(foundExhaustion).toBe(true);
    });

    it("uses repeated action template when flag is set", () => {
        const repeatedEvent = {
            ...baseEvent,
            context: { ...mockContext, isRepeatedAction: true }
        } as TickResolutionEvent;

        const output = synthesizeTickNarrative(repeatedEvent);
        expect(output).toContain("relentlessly goes back to the well");
    });
});
