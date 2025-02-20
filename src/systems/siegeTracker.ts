import { Collection } from "discord.js";

export default class siegeTracker {
  public r6Collection: Collection<string, number>;
  public siegePlayersCount: number;
  public uniqueMembers: Set<string>;
  public vcChannelId: string;
  public parentChannelId: string;

  constructor() {
    this.r6Collection = new Collection<string, number>();
    this.siegePlayersCount = 0;
    this.uniqueMembers = new Set<string>();
    this.vcChannelId = "";
    this.parentChannelId = "";
  }
}
export type siegetracker = typeof siegeTracker;
