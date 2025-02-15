import * as anchor from "@coral-xyz/anchor";
import { Mato } from "../anchor/types/mato.js";
import { logger } from "../utils/logger.js";

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
    logger.info("Market maker stopping...");
  }

  private async provideLiquidity() {
    try {
      await this.program.methods.withdrawSwappedTokenA();
    } catch (error) {
      logger.error("Fatal error in market making", {
        error: (error as Error).message,
      });
      this.stop();
      process.exit(1);
    }
  }
}
