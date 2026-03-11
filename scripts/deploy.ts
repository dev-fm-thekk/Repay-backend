import { network } from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { Hex, http, createWalletClient, createPublicClient, defineChain } from "viem";
import { hardhat, localhost } from "viem/chains";

import RewardTokenArtifact from "../artifacts/contracts/reward.sol/RewardToken.json";

dotenv.config({ path: ".env.app" });





async function main() {
  const { networkName } = await network.connect();

  console.log(`\n🚀 Starting deployment on network: ${networkName}`);
  console.log(`--------------------------------------------------`);

  const privateKey =
    networkName === "sepolia"
      ? process.env.SEPOLIA_PRIVATE_KEY
      : process.env.ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(`❌ No private key found for network ${networkName}`);
  }

  const account = privateKeyToAccount(privateKey as Hex);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545/"),
  });

  console.log(`👤 Using deployer account: ${account.address}`);

  const deployedContracts = [];

  console.log(`📦 Deploying RewardToken...`);

  try {
    const hash = await walletClient.deployContract({
      abi: RewardTokenArtifact.abi,
      bytecode: RewardTokenArtifact.bytecode as Hex,
      account,
      args: [],
    });

    console.log("⏳ Waiting for deployment confirmation...");

    const publicClient = createPublicClient({
      chain: localhost,
      transport: http(process.env.RPC_URL!)
    })

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    const contractAddress = receipt.contractAddress;

    console.log(`✅ Deployed RewardToken at: ${contractAddress}`);

    deployedContracts.push({
      name: "RewardToken",
      address: contractAddress,
      abi: RewardTokenArtifact.abi,
    });
  } catch (error: any) {
    console.error(`❌ Deployment failed:`, error.message);
  }

  const artifactsDir = path.join(process.cwd(), "deployment_logs");

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const outputFile = path.join(
    artifactsDir,
    `deploy-${networkName}-${timestamp}.json`
  );

  const deploymentMetadata = {
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: deployedContracts,
  };

  fs.writeFileSync(outputFile, JSON.stringify(deploymentMetadata, null, 2));

  console.log(`\n✅ Deployment Job Finished!`);
  console.table(
    deployedContracts.map((c) => ({
      Contract: c.name,
      Address: c.address,
    }))
  );

  console.log(`📂 Metadata saved to: ${outputFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
