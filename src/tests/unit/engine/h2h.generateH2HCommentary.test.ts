import { describe, it, expect, vi } from "vitest";
import { generateH2HCommentary, updateH2H, getH2HReport } from "@/engine/h2h";
import { BardEngine } from "@/engine/bard/BardEngine";
import { H2H_DOMINATION_MIN_MATCHES, H2H_DEADLOCK_MIN_MATCHES, H2H_STREAK_THRESHOLD } from "@/constants/engine/generation";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

vi.mock("@/engine/bard/BardEngine", () => ({
  BardEngine: {
    resolve: vi.fn().mockReturnValue({ text: "Mock commentary" }),
  },
}));

describe("generateH2HCommentary", () => {
    it("handles winning streak properly by avoiding domination thresholds", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: H2H_STREAK_THRESHOLD, // 3 usually
                losses: 0,
                streak: H2H_STREAK_THRESHOLD,
                lastMatch: { winnerId: "r1", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.winning_streak",
            expect.objectContaining({ P1: "Akebono", P2: "Takanohana", STREAK: String(H2H_STREAK_THRESHOLD) })
        );
    });

    it("handles losing streak properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: 0,
                losses: H2H_STREAK_THRESHOLD, // 3 usually
                streak: -H2H_STREAK_THRESHOLD,
                lastMatch: { winnerId: "r2", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.losing_streak",
            expect.objectContaining({ P1: "Akebono", P2: "Takanohana", STREAK: String(H2H_STREAK_THRESHOLD) })
        );
    });

    it("handles domination properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: H2H_DOMINATION_MIN_MATCHES,
                losses: 0,
                streak: H2H_DOMINATION_MIN_MATCHES,
                lastMatch: { winnerId: "r1", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.domination",
            expect.objectContaining({ P1: "Akebono", P2: "Takanohana", WINS: String(H2H_DOMINATION_MIN_MATCHES), LOSSES: "0", TOTAL: String(H2H_DOMINATION_MIN_MATCHES) })
        );
    });

    it("handles domination for P2 properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: 0,
                losses: H2H_DOMINATION_MIN_MATCHES,
                streak: -H2H_DOMINATION_MIN_MATCHES,
                lastMatch: { winnerId: "r2", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.domination",
            expect.objectContaining({ P1: "Takanohana", P2: "Akebono", WINS: String(H2H_DOMINATION_MIN_MATCHES), LOSSES: "0", TOTAL: String(H2H_DOMINATION_MIN_MATCHES) })
        );
    });

    it("handles deadlock properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: H2H_DEADLOCK_MIN_MATCHES + 1,
                losses: H2H_DEADLOCK_MIN_MATCHES + 1,
                streak: 1,
                lastMatch: { winnerId: "r1", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.deadlock",
            expect.objectContaining({ WINS: String(H2H_DEADLOCK_MIN_MATCHES + 1), LOSSES: String(H2H_DEADLOCK_MIN_MATCHES + 1) })
        );
    });

    it("handles first meeting properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {};

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.first_meeting"
        );
    });

    it("handles recent meeting properly (fallback of streak)", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: 1,
                losses: 0,
                streak: 1,
                lastMatch: { winnerId: "r1", kimarite: "yorikiri", bashoId: "1", day: 1, year: 1 }
            }
        };

        generateH2HCommentary(r1, r2);

        expect(BardEngine.resolve).toHaveBeenCalledWith(
            expect.anything(),
            "h2h.recent",
            expect.objectContaining({ DAY: "1", WINNER: "Akebono", LOSER: "Takanohana", KIMARITE: "yorikiri" })
        );
    });

    it("handles fallback generic properly", () => {
        const r1 = MockFactory.createRikishi({ id: "r1", shikona: "Akebono" });
        const r2 = MockFactory.createRikishi({ id: "r2", shikona: "Takanohana" });

        r1.h2h = {
            "r2": {
                wins: 1,
                losses: 0,
                streak: 1,
                lastMatch: null
            }
        };

        expect(generateH2HCommentary(r1, r2)).toBe("Akebono leads the series 1 to 0.");
    });
});
