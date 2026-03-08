import { network } from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { Hex, http, createWalletClient } from "viem";
import { localhost } from "viem/chains";

// Load environment variables from .env.app
dotenv.config({ path: ".env.app" });

async function main() {
  const { viem, networkName } = await network.connect();

  console.log(`\n🚀 Starting deployment on network: ${networkName}`);
  console.log(`--------------------------------------------------`);

  // Determine private key based on network
  const privateKey = networkName === "sepolia"
    ? process.env.SEPOLIA_PRIVATE_KEY
    : process.env.ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(`❌ No private key found for network ${networkName} in .env.app`);
  }

  const account = privateKeyToAccount(privateKey as Hex);
  
  const walletClient = createWalletClient({
    account: account,
    chain: localhost,
    transport: http(process.env.RPC_URL!),
  });

  console.log(`👤 Using deployer account: ${account.address}`);

  // Only deploy RewardToken for now as per the user's setup
  const contractsToDeploy = [
    { name: "RewardToken", args: [] }
  ];

  const deployedContracts = [];

  for (const contract of contractsToDeploy) {
    console.log(`📦 Deploying ${contract.name}...`);
    try {
      const deployment = await viem.deployContract(contract.name)
      console.log(`✅ Deployed ${contract.name} at: ${deployment.address}`);

      deployedContracts.push({
        name: contract.name,
        address: deployment.address,
        abi: deployment.abi,
      });
    } catch (error: any) {
      console.error(`❌ Failed to deploy ${contract.name}:`, error.message);
    }
  }

  // Handle artifact saving
  const artifactsDir = path.join(process.cwd(), "deployment_logs");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFile = path.join(artifactsDir, `deploy-${networkName}-${timestamp}.json`);

  const deploymentMetadata = {
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: deployedContracts,
  };

  fs.writeFileSync(outputFile, JSON.stringify(deploymentMetadata, null, 2));

  console.log(`\n✅ Deployment Job Finished!`);
  console.log(`--------------------------------------------------`);
  console.table(deployedContracts.map(c => ({ Contract: c.name, Address: c.address })));
  console.log(`📂 Metadata saved to: ${outputFile}`);
  console.log(`--------------------------------------------------\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
