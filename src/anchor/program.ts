// src/anchor/program.ts
import * as anchor from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import MatoIDL from "./idl/mato.json" with { type: "json" };
import type { Mato } from "./types/mato.ts";

export const createProgram = (
  connection: Connection,
  wallet: anchor.Wallet,
) => {
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  return new anchor.Program(
    MatoIDL as Mato,
    provider
  );
};