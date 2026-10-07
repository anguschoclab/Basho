import { describe, expect, it } from "vitest";
import { calculateTopRivals } from "@/presenters/rikishi/transformers/rivals";
import type { WorldState, Rikishi } from "@/engine/types";

describe("calculateTopRivals", () => {
    it("should return the correct top rivals with streak mapped", () => {
        const opp1 = { id: "opp1", shikona: "Opp 1" } as Rikishi;
        const opp2 = { id: "opp2", shikona: "Opp 2" } as Rikishi;

        const r1 = {
            id: "r1",
            shikona: "R1",
            h2h: {
                "opp1": { wins: 5, losses: 1, streak: 3 },
                "opp2": { wins: 1, losses: 5, streak: -4 }
            }
        } as unknown as Rikishi;

        const mockWorld = {
            rikishi: new Map([
                ["opp1", opp1],
                ["opp2", opp2]
            ]),
            rivalriesState: {
                pairs: {
                    "opp1|r1": { heat: 50, tone: "respect" },
                    "opp2|r1": { heat: 80, tone: "grudge" }
                }
            }
        } as unknown as WorldState;

        const rivals = calculateTopRivals(r1, mockWorld);

        expect(rivals).toBeDefined();
        expect(rivals.length).toBe(2);
        expect(rivals.find(r => r.opponentId === "opp1")?.heat).toBe(50);
        expect(rivals.find(r => r.opponentId === "opp1")?.streak).toBe(3);
        expect(rivals.find(r => r.opponentId === "opp2")?.streak).toBe(-4);
    });
});
