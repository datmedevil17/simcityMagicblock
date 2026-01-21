import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { SimcityBuild } from "../target/types/simcity_build";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";

describe("simcity", () => {
  console.log("simcity.ts");

  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Set up Ephemeral Rollup provider
  const providerEphemeralRollup = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.EPHEMERAL_PROVIDER_ENDPOINT ||
      "https://rpc.magicblock.app/devnet",
      {
        wsEndpoint:
          process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet.magicblock.app/",
      }
    ),
    anchor.Wallet.local()
  );

  console.log("Base Layer Connection: ", provider.connection.rpcEndpoint);
  console.log(
    "Ephemeral Rollup Connection: ",
    providerEphemeralRollup.connection.rpcEndpoint
  );
  console.log(`Current SOL Public Key: ${anchor.Wallet.local().publicKey}`);

  const program = anchor.workspace.SimcityBuild as Program<SimcityBuild>;
  const authority = provider.wallet;

  // Derive PDA using user's public key
  const [cityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [authority.publicKey.toBuffer()],
    program.programId
  );

  console.log("Program ID: ", program.programId.toString());
  console.log("City PDA: ", cityPDA.toString());

  before(async function () {
    const balance = await provider.connection.getBalance(
      anchor.Wallet.local().publicKey
    );
    console.log("Current balance is", balance / LAMPORTS_PER_SOL, " SOL", "\n");
  });

  // ========================================
  // Base Layer Tests
  // ========================================

  describe("initialize_city", () => {
    it("initializes a city", async () => {
      const start = Date.now();
      let tx = await program.methods
        .initializeCity()
        .accounts({
          authority: authority.publicKey,
        })
        .transaction();

      const txHash = await provider.sendAndConfirm(
        tx,
        [provider.wallet.payer],
        {
          skipPreflight: true,
          commitment: "confirmed",
        }
      );
      const duration = Date.now() - start;
      console.log(`${duration}ms (Base Layer) Initialize City txHash: ${txHash}`);

      const cityAccount = await program.account.city.fetch(cityPDA);
      expect(cityAccount.money.toNumber()).to.equal(10000);
      expect(cityAccount.population).to.equal(0);
      // Check if tiles are all 0
      // anchor returns arrays as normal JS arrays usually
      const tiles = cityAccount.tiles as number[][];
      expect(tiles.length).to.equal(16);
      expect(tiles[0].length).to.equal(16);
      expect(tiles[0][0]).to.equal(0);
    });
  });

  describe("place_building", () => {
    it("places a building", async () => {
      const start = Date.now();
      const txHash = await program.methods
        .placeBuilding(5, 5, 2) // x=5, y=5, type=2 (Residential)
        // @ts-ignore
        .accounts({
          city: cityPDA,
          signer: authority.publicKey,
          sessionToken: null,
        })
        .rpc();
      const duration = Date.now() - start;
      console.log(`${duration}ms (Base Layer) Place Building txHash: ${txHash}`);

      const cityAccount = await program.account.city.fetch(cityPDA);
      const tiles = cityAccount.tiles as number[][];
      expect(tiles[5][5]).to.equal(2);
      expect(cityAccount.money.toNumber()).to.equal(9900); // 10000 - 100
    });
  });

  describe("bulldoze", () => {
    it("bulldozes a tile", async () => {
      const start = Date.now();
      const txHash = await program.methods
        .bulldoze(5, 5)
        // @ts-ignore
        .accounts({
          city: cityPDA,
          signer: authority.publicKey,
          sessionToken: null,
        })
        .rpc();
      const duration = Date.now() - start;
      console.log(`${duration}ms (Base Layer) Bulldoze txHash: ${txHash}`);

      const cityAccount = await program.account.city.fetch(cityPDA);
      const tiles = cityAccount.tiles as number[][];
      expect(tiles[5][5]).to.equal(0);
    });
  });

  // ========================================
  // Ephemeral Rollups Tests
  // ========================================

  describe("delegation", () => {
    it("delegates city to ER", async () => {
      const start = Date.now();
      // Add local validator identity to remaining accounts if running on localnet
      const remainingAccounts =
        providerEphemeralRollup.connection.rpcEndpoint.includes("localhost") ||
          providerEphemeralRollup.connection.rpcEndpoint.includes("127.0.0.1")
          ? [
            {
              pubkey: new web3.PublicKey(
                "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev"
              ),
              isSigner: false,
              isWritable: false,
            },
          ]
          : [];

      const txHash = await program.methods
        .delegate()
        // @ts-ignore
        .accounts({
          payer: authority.publicKey,
          pda: cityPDA,
        })
        .remainingAccounts(remainingAccounts)
        .rpc();
      const duration = Date.now() - start;
      console.log(`${duration}ms (Base Layer) Delegate txHash: ${txHash}`);
    });

    it("places building on ER", async () => {
      const start = Date.now();
      // Build transaction using base program
      let tx = await program.methods
        .placeBuilding(3, 3, 3) // x=3, y=3, type=3(Commercial)
        // @ts-ignore
        .accounts({
          city: cityPDA,
          signer: authority.publicKey,
          sessionToken: null,
        })
        .transaction();

      // Set up for ER connection
      tx.feePayer = providerEphemeralRollup.wallet.publicKey;
      tx.recentBlockhash = (
        await providerEphemeralRollup.connection.getLatestBlockhash()
      ).blockhash;
      tx = await providerEphemeralRollup.wallet.signTransaction(tx);

      // Send using raw connection to avoid Anchor response parsing issues
      const txHash = await providerEphemeralRollup.connection.sendRawTransaction(
        tx.serialize(),
        { skipPreflight: true }
      );
      await providerEphemeralRollup.connection.confirmTransaction(txHash, "confirmed");

      const duration = Date.now() - start;
      console.log(`${duration}ms (ER) Place Building txHash: ${txHash}`);
    });

    it("undelegates city from ER to Solana", async () => {
      const start = Date.now();
      // Build transaction using base program
      let tx = await program.methods
        .undelegate()
        // @ts-ignore
        .accounts({
          payer: providerEphemeralRollup.wallet.publicKey,
          city: cityPDA,
        })
        .transaction();

      // Set up for ER connection
      tx.feePayer = providerEphemeralRollup.wallet.publicKey;
      tx.recentBlockhash = (
        await providerEphemeralRollup.connection.getLatestBlockhash()
      ).blockhash;
      tx = await providerEphemeralRollup.wallet.signTransaction(tx);

      // Send using raw connection to avoid Anchor response parsing issues
      const txHash = await providerEphemeralRollup.connection.sendRawTransaction(
        tx.serialize(),
        { skipPreflight: true }
      );
      await providerEphemeralRollup.connection.confirmTransaction(txHash, "confirmed");

      const duration = Date.now() - start;
      console.log(`${duration}ms (ER) Undelegate txHash: ${txHash}`);

      // Verify the city was updated
      // We placed a building at 3,3 type 3. and we bulldozed 5,5 previously.
      // And initialized with 10000.
      // -100 for place 5,5 (then bulldozed).
      // -100 for place 3,3 on ER.
      // Total money should be 9800.
      const cityAccount = await program.account.city.fetch(cityPDA);
      console.log(`City money after undelegation: ${cityAccount.money}`);
      expect(cityAccount.money.toNumber()).to.equal(9800);
      const tiles = cityAccount.tiles as number[][];
      expect(tiles[3][3]).to.equal(3);
    });
  });
});
