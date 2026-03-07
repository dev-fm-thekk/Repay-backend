import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { http, isAddress } from "viem";
import { Address, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// =============================
// 🔐 CONFIG
// =============================

const ORIGINAL_DEPLOYER = "0xA87fd5C0EE110cEAA1939C01C1D8623ac4417A2f";
const GOV_ADDRESS = "0xA87fd5C0EE110cEAA1939C01C1D8623ac4417A2f";

const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as Address);

const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c995d7a";

// =============================

async function executeAndWait(
  publicClient: any,
  txPromise: Promise<`0x${string}`>,
  label: string
) {
  console.log(`\n⚙️ ${label}`);

  const hash = await txPromise;
  console.log(`🔗 TX Hash: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error(`${label} failed`);
  }

  console.log(`✅ Confirmed | Block: ${receipt.blockNumber} | Gas: ${receipt.gasUsed}`);

  return hash;
}

async function main() {
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients({ account, chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) });

  console.log(`\n🚀 Network: ${networkName}`);
  console.log("--------------------------------------------------");

  

  const deployer = ORIGINAL_DEPLOYER;
  const oracle = ORIGINAL_DEPLOYER;
  const gov = GOV_ADDRESS;
  const transitAuthority = GOV_ADDRESS;

  // =============================
  // 📦 DEPLOY CONTRACTS (NO WAIT)
  // =============================

  const productRegistry = await viem.deployContract("ProductRegistry");
  const ecoToken = await viem.deployContract("EcoToken");
  const ticketNFT = await viem.deployContract("TicketNFT", [
    ecoToken.address,
    transitAuthority,
  ]);
  const nftMarketPlace = await viem.deployContract("NFTMarketPlace", [
    ecoToken.address,
    gov,
    5n,
  ]);
  const smartBin = await viem.deployContract("SmartBin", [
    productRegistry.address,
    ecoToken.address,
    oracle,
    gov,
  ]);
  const materialAuction = await viem.deployContract("MaterialAuction", [
    gov,
    smartBin.address,
  ]);

  console.log("\n📦 Contracts deployed (not waiting for receipts)");
  console.table([
    { name: "ProductRegistry", address: productRegistry.address },
    { name: "EcoToken", address: ecoToken.address },
    { name: "TicketNFT", address: ticketNFT.address },
    { name: "NFTMarketPlace", address: nftMarketPlace.address },
    { name: "SmartBin", address: smartBin.address },
    { name: "MaterialAuction", address: materialAuction.address },
  ]);

  // =============================
  // ⚙️ INITIALIZATION (WAIT HERE)
  // =============================

  const registerBinHash = await executeAndWait(
    publicClient,
    productRegistry.write.registerBin([smartBin.address]),
    "Register SmartBin in ProductRegistry"
  );

  const registerOracleHash = await executeAndWait(
    publicClient,
    smartBin.write.registerBin([
      oracle,
      "Main SmartBin Node 0",
      oracle,
    ]),
    "Register Oracle in SmartBin"
  );

  const grantRoleHash = await executeAndWait(
    publicClient,
    ecoToken.write.grantRole([
      MINTER_ROLE,
      smartBin.address,
    ]),
    "Grant MINTER_ROLE to SmartBin"
  );

  // =============================
  // 📁 SAVE METADATA
  // =============================

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const metadata = {
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer,
    contracts: {
      ProductRegistry: productRegistry.address,
      EcoToken: ecoToken.address,
      TicketNFT: ticketNFT.address,
      NFTMarketPlace: nftMarketPlace.address,
      SmartBin: smartBin.address,
      MaterialAuction: materialAuction.address,
    },
    initializationTx: {
      registerBinHash,
      registerOracleHash,
      grantRoleHash,
    },
  };

  fs.writeFileSync(
    path.join(deploymentsDir, `latest.json`),
    JSON.stringify(metadata, null, 2)
  );

  console.log("\n✅ Deployment + Initialization Complete");
  console.log("--------------------------------------------------\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed");
  console.error(err);
  process.exit(1);
});