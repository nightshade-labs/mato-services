import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createProgram } from "./anchor/program.js";
import { MarketMakerService } from "./services/marketMaker.js";
import { logger } from "./utils/logger.js";
import { DataFetcherService } from "./services/dataFetcher.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes/index.js";

const loadWallet = (privateKeyBase58: string): anchor.Wallet => {
  const privateKey = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(new Uint8Array(privateKey));
  return new anchor.Wallet(keypair);
};

const exits = new PublicKey("7fn18qWcZHXLGuwcb9vGJwLs6Vf6f3nZHBmjgNiJJPe1");
const prices = new PublicKey("BDRwP7699RGQ7Kj7gowNdh2wuscrcMjZLkaqh7x7tDSx");

async function main() {
  // Initialize connection and wallet
  const connection = new Connection(clusterApiUrl("devnet"));
  // const wallet = loadWallet(process.env.SOLANA_PRIVATE_KEY!);
  const wallet = loadWallet(
    "55M9J2bYYcFTKE4Aa8YnVzz8k2Nt91x2V8Cxb2zEeFJz7C4uaSMazYa4MvkhdVyt9ygd8hHNNKuYV2ahUkK48iJ4"
  );

  // Create Anchor program
  const program = createProgram(connection, wallet);

  const [market] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), exits.toBuffer(), prices.toBuffer()],
    program.programId
  );

  // Initialize services
  const dataFetcher = new DataFetcherService(program);
  const marketMaker = new MarketMakerService(program);

  // Handle process signals
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    dataFetcher.stop();
    marketMaker.stop();
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received. Shutting down gracefully...");
    dataFetcher.stop();
    marketMaker.stop();
  });

  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught exception", { error: error.message });
    dataFetcher.stop();
    marketMaker.stop();
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled rejection", { reason: reason });
    dataFetcher.stop();
    marketMaker.stop();
    process.exit(1);
  });

  // Start services
  dataFetcher.start(market).catch((error: Error) => {
    logger.error("Failed to start data fetcher", { error: error.message });
    process.exit(1);
  });
  // marketMaker.start(30);
}

main().catch((error: Error) => {
  logger.error("Error running services", { error: error.message });
  process.exit(1);
});
