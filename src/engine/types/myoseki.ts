import type { Id } from "./common";

/** Type representing myoseki status. */
export type MyosekiStatus = "held" | "leased" | "available";

/** Defines the structure for myoseki stock. */
export interface MyosekiStock {
  id: Id;
  name: string;
  prestigeTier: "elite" | "respected" | "modest";

  /**
   * The actual owner of the stock.
   * This is typically an Oyakata ID, a retired Rikishi ID, or "JSA" if unassigned.
   */
  ownerId: Id;

  /**
   * Who is currently utilizing the stock (e.g. if leased).
   * If not leased, this equals ownerId.
   */
  holderId: Id;

  status: MyosekiStatus;

  /** If leased, the annual fee paid to the owner. */
  leaseFee?: number;

  /** If available for sale, the asking price in yen. */
  askingPrice?: number;
}

/** Defines the structure for myoseki transaction. */
export interface MyosekiTransaction {
  id: Id;
  date: string; // Year-WWeek
  myosekiId: Id;
  type: "sale" | "lease" | "return";
  fromId: Id;
  toId: Id;
  amount: number;
}

/** Defines the structure for myoseki market. */
export interface MyosekiMarket {
  stocks: Record<Id, MyosekiStock>;
  history: MyosekiTransaction[];
}
