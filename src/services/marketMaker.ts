import * as anchor from "@coral-xyz/anchor";
import { Mato } from "../anchor/types/mato.js";

export class MarketMakerService {
  private program: anchor.Program<Mato>;
  private interval: NodeJS.Timeout | null = null;

  constructor(program: anchor.Program<Mato>) {
    this.program = program;
  }

  start(intervalMs: number) {
    this.interval = setInterval(this.provideLiquidity.bind(this), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async provideLiquidity() {
    try {
      await this.program.methods.withdrawSwappedTokenA();
    } catch (error) {
      console.error("Transaction error:", error);
    }
  }
}
