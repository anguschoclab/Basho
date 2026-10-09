/**
 * commands/economy.ts
 * ===================
 * Economy commands: myoseki trades, sponsors, loans, and staff hiring.
 */

import * as myoseki from "../../myosekiMarket";
import * as myosekiTrading from "../../systems/governance/MyosekiTradingService";
import { MYOSEKI_BASE_ASKING_PRICE } from "../../../constants/engine/economic";
import * as sponsorService from "../../systems/economy/SponsorContractService";
import * as staffService from "../../staff";
import * as loans from "../../loans";
import { resolveImpacts } from "../../core/ImpactResolver";
import { recruitSponsor } from "../../systems/economy/sponsorshipMutations";
import { rngForWorld } from "../../rng";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

export function economyCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    BUY_MYOSEKI: (cmd) => {
      if (rt.world) {
        const impact = myoseki.buyMyoseki(
          rt.world,
          cmd.buyerId,
          cmd.buyerHeyaId,
          cmd.myosekiId
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    LEASE_MYOSEKI: (cmd) => {
      if (rt.world) {
        const impact = myoseki.leaseMyoseki(rt.world, cmd.buyerId, cmd.myosekiId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    LIST_MYOSEKI_FOR_SALE: (cmd) => {
      if (rt.world?.myosekiMarket) {
        const stock = rt.world.myosekiMarket.stocks[cmd.myosekiId];
        if (!stock || stock.holderId !== cmd.holderId || stock.status !== "held") return;
        const askingPrice = cmd.askingPrice ?? stock.askingPrice ?? MYOSEKI_BASE_ASKING_PRICE;
        const impact = myosekiTrading.listMyosekiForSale(
          rt.world,
          rt.world.myosekiMarket,
          cmd.myosekiId,
          askingPrice
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    RETURN_MYOSEKI_LEASE: (cmd) => {
      if (rt.world?.myosekiMarket) {
        const stock = rt.world.myosekiMarket.stocks[cmd.myosekiId];
        if (!stock || stock.holderId !== cmd.holderId || stock.status !== "leased") return;
        const impact = myosekiTrading.returnLeasedMyoseki(
          rt.world,
          rt.world.myosekiMarket,
          cmd.myosekiId
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    RENEW_SPONSOR: (cmd) => {
      if (rt.world) {
        const impact = sponsorService.renewSponsorContract(
          rt.world,
          cmd.relationshipId,
          cmd.sponsorId
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    RECRUIT_SPONSOR: (cmd) => {
      if (rt.world) {
        const rng = rngForWorld(
          rt.world,
          "sponsors",
          `recruit_${cmd.heyaId}_${cmd.sponsorId}_${rt.world.dayIndexGlobal}`
        );
        const impact = recruitSponsor(rt.world, cmd.heyaId, cmd.sponsorId, rng);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    REQUEST_BAILOUT: (cmd) => {
      if (rt.world) {
        const impact = loans.issueBailoutLoanIfNeeded(rt.world, cmd.heyaId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    PREPAY_LOAN: (cmd) => {
      if (rt.world) {
        const impact = loans.prepayLoan(rt.world, cmd.heyaId, cmd.loanId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    HIRE_STAFF: (cmd) => {
      if (rt.world) {
        const impact = staffService.hireStaff(rt.world, cmd.heyaId, cmd.role);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    FIRE_STAFF: (cmd) => {
      if (rt.world) {
        const impact = staffService.fireStaff(rt.world, cmd.heyaId, cmd.staffId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
  };
}
