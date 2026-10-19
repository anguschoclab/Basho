/**
 * Avatar coverage — identified persons render a SumoAvatar (pixel svg)
 * on the surfaces where they are named: stable roster tables, stable cards
 * (oyakata portrait), retirement ceremonies, rivalry cards, tournament
 * ceremonies, and tsukebito panels.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import { HeyaCard } from "@/components/menu/HeyaCard";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { RivalryCard } from "@/components/rivalries/RivalryCard";
import { ChampionSection } from "@/components/recap/TournamentCeremonySections";
import { TsukebitoPanel } from "@/components/training/TsukebitoPanel";
import { resolveAvatar, rikishiStageInput, oyakataStageInput } from "@/presenters/avatarProjections";
import { generateAvatarIdentity } from "@/engine/avatarGenerator";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { RivalryPairState } from "@/constants/engine/rivalry";
import type { TsukebitoProjection } from "@/presenters/tsukebitoProjections";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

// HeyaCard renders BookmarkButton which requires game context — stub it out.
vi.mock("@/components/bookmark/BookmarkButton", () => ({
  BookmarkButton: () => null,
}));

const avatarSvgs = (c: HTMLElement | Document) =>
  c.querySelectorAll('svg[shape-rendering="crispEdges"]');

function rikishi(id: string, over: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    nationality: "Japan",
    birthYear: 2000,
    age: 25,
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    height: 180,
    weight: 140,
    injured: false,
    stats: { aggression: 50 } as any,
    avatarConfig: generateAvatarIdentity({ seed: id, nationality: "Japan", role: "rikishi" }),
    ...over,
  } as Rikishi;
}

function uiRikishi(id: string, over: Partial<UIRikishi> = {}): UIRikishi {
  const entity = rikishi(id);
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    avatar: resolveAvatar({
      id,
      stored: entity.avatarConfig,
      nationality: "Japan",
      ...rikishiStageInput(entity, 2025),
    }),
    ...over,
  } as UIRikishi;
}

describe("avatar coverage — roster & stable surfaces", () => {
  afterEach(cleanup);

  it("StableStatsTable renders an avatar beside each rikishi name", () => {
    const { container } = render(
      <StableStatsTable rikishiList={[uiRikishi("r1"), uiRikishi("r2")]} />
    );
    expect(avatarSvgs(container).length).toBeGreaterThanOrEqual(2);
  });

  it("HeyaCard renders the stable oyakata portrait", () => {
    const oyakata = {
      id: "o1",
      name: "Master Test",
      age: 55,
      avatarConfig: generateAvatarIdentity({
        seed: "o1",
        nationality: "Japan",
        role: "oyakata",
      }),
    } as Oyakata;
    const heya = {
      id: "h1",
      name: "Test Heya",
      statureBand: "established",
      rikishiIds: [],
      funds: 1_000_000,
    } as unknown as Heya;
    const { container } = render(
      <HeyaCard
        heya={heya}
        isSelected={false}
        onSelect={vi.fn()}
        sekitoriCount={2}
        oyakata={oyakata}
      />
    );
    expect(avatarSvgs(container).length).toBeGreaterThanOrEqual(1);
  });
});

describe("avatar coverage — ceremonies & rivalries", () => {
  afterEach(cleanup);

  it("IntaiCeremony renders the retiring rikishi's avatar", () => {
    const { container } = render(
      <IntaiCeremony
        rikishi={uiRikishi("ret1")}
        reason="age"
        heyaName="Test Heya"
        isPlayerRikishi
        open
        onClose={vi.fn()}
      />
    );
    expect(avatarSvgs(container.ownerDocument.body).length).toBeGreaterThanOrEqual(1);
  });

  it("ChampionSection renders the yusho winner's avatar", () => {
    const { container } = render(
      <ChampionSection
        champion={{ rikishi: uiRikishi("champ1"), heyaName: "Test Heya" }}
        isPlayerChampion={false}
      />
    );
    expect(avatarSvgs(container).length).toBeGreaterThanOrEqual(1);
  });

  it("RivalryCard renders avatars for both rikishi", () => {
    const world = {
      rikishi: new Map([
        ["rA", rikishi("rA")],
        ["rB", rikishi("rB", { side: "west" })],
      ]),
      heyas: new Map([["h1", { id: "h1", name: "Test Heya" } as Heya]]),
      year: 2025,
      playerHeyaId: "h1",
    } as unknown as WorldState;
    const pair = {
      key: "rA|rB",
      aId: "rA",
      bId: "rB",
      heat: 50,
      meetings: 5,
      lastMetWeek: 3,
      aWins: 2,
      bWins: 3,
      closeness: 60,
      spite: 40,
      tone: "respect",
      triggers: {},
    } as RivalryPairState;
    const { container } = render(<RivalryCard pair={pair} world={world} index={0} />);
    expect(avatarSvgs(container).length).toBeGreaterThanOrEqual(2);
  });
});

describe("avatar coverage — tsukebito panel", () => {
  afterEach(cleanup);

  it("renders avatars for seniors and juniors", () => {
    const senior = rikishi("sen1");
    const junior = rikishi("jun1", { rankNumber: 20 });
    const seniorAvatar = resolveAvatar({
      id: senior.id,
      stored: senior.avatarConfig,
      ...rikishiStageInput(senior, 2025),
    });
    const juniorAvatar = resolveAvatar({
      id: junior.id,
      stored: junior.avatarConfig,
      ...rikishiStageInput(junior, 2025),
    });
    const projection = {
      assignments: [],
      eligibleSeniors: [
        {
          id: senior.id,
          shikona: senior.shikona,
          rankLabel: "maegashira",
          currentCount: 0,
          maxCount: 2,
          avatar: seniorAvatar,
        },
      ],
      eligibleJuniors: [
        {
          id: junior.id,
          shikona: junior.shikona,
          rankLabel: "jonidan",
          assignedTo: null,
          avatar: juniorAvatar,
        },
      ],
    } as TsukebitoProjection;
    const { container } = render(
      <TsukebitoPanel projection={projection} onSet={vi.fn()} onClear={vi.fn()} />
    );
    expect(avatarSvgs(container).length).toBeGreaterThanOrEqual(1);
  });
});
