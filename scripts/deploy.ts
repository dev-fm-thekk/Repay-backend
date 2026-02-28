import { network } from "hardhat";
import fs from "fs";
import path from "path";

const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

// --- Updated Logging: Start ---
console.log(`\n🚀 Starting deployment on network: ${networkName}`);
console.log(`--------------------------------------------------`);
// --- End Logging ---

const contracts = [
  "EcoToken",
  "MaterialAuction",
  "NFTMarketPlace",
  "ProductRegistry",
  "SmartBin",
  "TicketNFT",
];

const deployedContracts = await Promise.all(
  contracts.map(async (contractName) => {
    // --- Updated Logging: Per Contract ---
    console.log(`📦 Deploying ${contractName}...`);
    // --- End Logging ---

    const deployment = await viem.deployContract(contractName);

    return {
      name: contractName,
      address: deployment.address,
      abi: deployment.abi,
    };
  })
);

const artifactsDir = path.join(process.cwd(), "artifacts");

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir);
}

const existingVersions = fs
  .readdirSync(artifactsDir)
  .filter((file) => /^v\d+\.json$/.test(file))
  .map((file) => parseInt(file.match(/^v(\d+)\.json$/)?.[1] || "0"));

const nextVersion = existingVersions.length
  ? Math.max(...existingVersions) + 1
  : 1;

const outputFile = path.join(artifactsDir, `v${nextVersion}.json`);

const deploymentMetadata = {
  version: `v${nextVersion}`,
  network: networkName,
  deployedAt: new Date().toISOString(),
  contracts: deployedContracts,
};

fs.writeFileSync(outputFile, JSON.stringify(deploymentMetadata, null, 2));

// --- Updated Logging: Success Summary ---
console.log(`\n✅ Deployment Successful!`);
console.log(`--------------------------------------------------`);
console.table(deployedContracts.map(c => ({ Contract: c.name, Address: c.address })));
console.log(`📂 Metadata saved to: artifacts/v${nextVersion}.json`);
console.log(`--------------------------------------------------\n`);
// --- End Logging ---