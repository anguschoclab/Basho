import type { WorldState } from "../types/world";
import type { UIDigest } from "../../presenters/uiDigest";

/** UI -> Worker Commands */
export type EngineCommand =
  | { type: "START_WORLD"; seed: string; playerHeyaId?: string }
  | { type: "LOAD_WORLD"; world: WorldState }
  | { type: "TICK_DAY" }
  | { type: "TICK_MULTIPLE_DAYS"; days: number }
  | { type: "START_BASHO" }
  | { type: "AUTO_SIM_DAYS"; days: number }
  | { type: "OFFER_CONTRACT"; rikishiId: string; heyaId: string }
  | { type: "GET_DIGEST" };

/** Worker -> UI Events */
export type EngineEvent =
  | { type: "READY"; worldExists: boolean }
  | { type: "TICK_COMPLETED"; digest: UIDigest }
  | { type: "DIGEST_UPDATED"; digest: UIDigest }
  | { type: "WORLD_UPDATED"; world: WorldState }
  | { type: "ERROR"; message: string }
  | { type: "PROGRESS"; message: string; current: number; total: number };

export interface WorkerMessage<T = EngineCommand | EngineEvent> {
  data: T;
}
