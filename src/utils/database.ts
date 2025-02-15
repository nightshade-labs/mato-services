import { logger } from "./logger.js";
import pkg from "pg";
const { Pool } = pkg;

export interface MarketData {
  market: string;
  slot: number;
  flow_a: bigint;
  flow_b: bigint;
}

export class Database {
  private pool: pkg.Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || "mato",
      user: process.env.PGUSER || "mato",
      password: process.env.PGPASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", { error: err.message });
    });
  }

  async setupDatabase() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS timescaledb;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS market_data (
          time TIMESTAMPTZ NOT NULL,
          market TEXT NOT NULL CHECK (market <> ''),
          slot BIGINT NOT NULL CHECK (slot > 0),
          flow_a NUMERIC NOT NULL,
          flow_b NUMERIC NOT NULL,
          CONSTRAINT positive_flows CHECK (flow_a >= 0 AND flow_b >= 0)
        );
      `);

      // Convert to hypertable
      await client.query(`
        SELECT create_hypertable('market_data', 'time', if_not_exists => TRUE);
      `);

      // Create indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_market_data_market ON market_data(market);
        CREATE INDEX IF NOT EXISTS idx_market_data_slot ON market_data(slot);
      `);
    } catch (error) {
      logger.error("Error setting up database", { error: error });
      throw error;
    } finally {
      client.release();
    }
  }

  async storeData(data: MarketData[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO market_data (time, market, slot, flow_a, flow_b)
        VALUES ($1, $2, $3, $4, $5)
        DO UPDATE SET
          flow_a = EXCLUDED.flow_a,
          flow_b = EXCLUDED.flow_b;
      `;

      for (const record of data) {
        await client.query(query, [
          new Date(),
          record.market,
          record.slot,
          record.flow_a.toString(),
          record.flow_b.toString(),
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
