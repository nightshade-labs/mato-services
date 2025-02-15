import { Database, MarketData } from "../utils/database.js";
import { logger } from "../utils/logger.js";
import * as anchor from "@coral-xyz/anchor";
import { Mato } from "../anchor/types/mato.js";

export class DataFetcherService {
  private program: anchor.Program<Mato>;
  private database: Database;
  private isRunning: boolean;

  constructor(program: anchor.Program<Mato>) {
    this.program = program;
    this.database = new Database();
    this.isRunning = false;
  }

  async start(marketAddress: anchor.web3.PublicKey): Promise<void> {
    if (this.isRunning) {
      logger.warn("Data fetcher is already running");
      return;
    }

    try {
      this.isRunning = true;
      await this.database.setupDatabase();

      // Start indexing loop
      while (this.isRunning) {
        try {
          const startTime = Date.now();
          const slot = await this.program.provider.connection.getSlot();
          const market = await this.program.account.market.fetch(marketAddress);
          const marketData: MarketData[] = [
            {
              market: marketAddress.toString(),
              slot: slot,
              flow_a: market.tokenAVolume,
              flow_b: market.tokenBVolume,
            },
          ];
          await this.database.storeData(marketData);

          const processingTime = Date.now() - startTime;
          logger.info("Indexing cycle completed", {
            recordCount: marketData.length,
            processingTime,
          });

          const sleepTime = Math.max(0, 5000 - processingTime);
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        } catch (error) {
          logger.error("Error in indexing cycle", {
            error: (error as Error).message,
          });
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      logger.error("Fatal error in indexer", {
        error: (error as Error).message,
      });
      this.stop();
      process.exit(1);
    }
  }

  stop(): void {
    this.isRunning = false;
    logger.info("Data fetcher stopping...");
  }
}
