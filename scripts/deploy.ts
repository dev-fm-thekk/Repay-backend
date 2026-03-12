import { network } from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { Hex, http, createWalletClient, createPublicClient } from "viem";
import { hardhat, localhost } from "viem/chains";

import RewardTokenArtifact from "../artifacts/contracts/reward.sol/RewardToken.json";
import AgencyRegistryArtifact from "../artifacts/contracts/agency.sol/AgencyRegistry.json";
import ServiceRegistryArtifact from "../artifacts/contracts/services.sol/ServiceRegistry.json";
import TicketNFTArtifact from "../artifacts/contracts/ticket.sol/TicketNFT.json";

dotenv.config({ path: ".env.app" });

// ── Helper: deploy one contract and wait for receipt ─────────────────────────
async function deployContract(
  label: string,
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  artifact: { abi: any; bytecode: string },
  args: unknown[] = []
): Promise<string> {
  console.log(`\n📦 Deploying ${label}...`);

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as Hex,
    account,
    args,
    chain: hardhat,
  });

  console.log(`⏳ Waiting for ${label} confirmation...`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error(`❌ No contract address in receipt for ${label}`);
  }

  console.log(`✅ Deployed ${label} at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

// ── Helper: update .env.app with new key=value entries ───────────────────────
function updateEnvFile(envPath: string, updates: Record<string, string>) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content.trimStart());
  console.log(`\n📝 Updated .env.app with deployed addresses`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { networkName } = await network.connect();

  console.log(`\n🚀 Starting deployment on network: ${networkName}`);
  console.log(`--------------------------------------------------`);

  const privateKey =
    networkName === "sepolia"
      ? process.env.SEPOLIA_PRIVATE_KEY
      : process.env.ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(`❌ No private key found for network: ${networkName}`);
  }

  const account = privateKeyToAccount(privateKey as Hex);
  console.log(`👤 Using deployer account: ${account.address}`);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545/"),
  });

  const publicClient = createPublicClient({
    chain: localhost,
    transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545/"),
  });

  const deployedContracts: { name: string; address: string; abi: any }[] = [];

  // ── 1. RewardToken (no constructor args) ──────────────────────────────────
  const rewardTokenAddress = await deployContract(
    "RewardToken",
    walletClient,
    publicClient,
    account,
    RewardTokenArtifact
  );
  deployedContracts.push({
    name: "RewardToken",
    address: rewardTokenAddress,
    abi: RewardTokenArtifact.abi,
  });

  // ── 2. AgencyRegistry (no constructor args) ───────────────────────────────
  const agencyRegistryAddress = await deployContract(
    "AgencyRegistry",
    walletClient,
    publicClient,
    account,
    AgencyRegistryArtifact
  );
  deployedContracts.push({
    name: "AgencyRegistry",
    address: agencyRegistryAddress,
    abi: AgencyRegistryArtifact.abi,
  });

  // ── 3. ServiceRegistry (requires AgencyRegistry address) ──────────────────
  const serviceRegistryAddress = await deployContract(
    "ServiceRegistry",
    walletClient,
    publicClient,
    account,
    ServiceRegistryArtifact,
    [agencyRegistryAddress]
  );
  deployedContracts.push({
    name: "ServiceRegistry",
    address: serviceRegistryAddress,
    abi: ServiceRegistryArtifact.abi,
  });

  // ── 4. TicketNFT (requires RewardToken, AgencyRegistry, ServiceRegistry) ──
  const ticketNFTAddress = await deployContract(
    "TicketNFT",
    walletClient,
    publicClient,
    account,
    TicketNFTArtifact,
    [rewardTokenAddress, agencyRegistryAddress, serviceRegistryAddress]
  );

  deployedContracts.push({
    name: "TicketNFT",
    address: ticketNFTAddress,
    abi: TicketNFTArtifact.abi,
  });


  console.log("\n🔗 Setting ticket contract in ServiceRegistry...");

  const setTicketHash = await walletClient.writeContract({
    address: serviceRegistryAddress as Hex,
    abi: ServiceRegistryArtifact.abi,
    functionName: "setTicketContract",
    args: [ticketNFTAddress],
    account,
    chain: hardhat,
  });

  console.log("⏳ Waiting for confirmation...");

  await publicClient.waitForTransactionReceipt({
    hash: setTicketHash,
  });

  console.log(
    "✅ Ticket contract registered in ServiceRegistry:",
    ticketNFTAddress
  );

  // ── Save deployment log ────────────────────────────────────────────────────
  const logsDir = path.join(process.cwd(), "deployment_logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFile = path.join(logsDir, `deploy-${networkName}-${timestamp}.json`);

  const deploymentMetadata = {
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: deployedContracts.map(({ name, address }) => ({ name, address })),
  };

  fs.writeFileSync(outputFile, JSON.stringify(deploymentMetadata, null, 2));

  // ── Auto-update .env.app with deployed addresses ───────────────────────────
  const envPath = path.join(process.cwd(), ".env.app");
  updateEnvFile(envPath, {
    REWARD_TOKEN: rewardTokenAddress,
    AGENCY_REGISTRY: agencyRegistryAddress,
    SERVICE_REGISTRY: serviceRegistryAddress,
    TICKET_NFT: ticketNFTAddress,
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n✅ All contracts deployed successfully!\n`);
  console.table(
    deployedContracts.map((c) => ({
      Contract: c.name,
      Address: c.address,
    }))
  );
  console.log(`📂 Deployment log saved to: ${outputFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
