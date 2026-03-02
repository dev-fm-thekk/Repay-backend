import { network } from "hardhat";
import fs from "fs";
import path from "path";

const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

// --- Updated Logging: Start ---
console.log(`\n🚀 Starting deployment on network: ${networkName}`);
console.log(`--------------------------------------------------`);
// --- End Logging ---

// Get account addresses
const [deployer, account2, account3] = await viem.getWalletClients();
const deployerAddress = deployer.account.address;
const oracleAddress = account2.account.address;
const govAddress = deployerAddress; // Using first account as gov too for simplicity
const transitAuthorityAddress = deployerAddress;

console.log(`\n🚀 Starting deployment on network: ${networkName}`);
console.log(`📝 Deployer: ${deployerAddress}`);
console.log(`📝 Oracle: ${oracleAddress}`);
console.log(`📝 Government: ${govAddress}\n`);
console.log(`--------------------------------------------------`);

// 1. ProductRegistry
console.log(`📦 Deploying ProductRegistry...`);
const productRegistry = await viem.deployContract("ProductRegistry");

// 2. EcoToken
console.log(`📦 Deploying EcoToken...`);
const ecoToken = await viem.deployContract("EcoToken");

// 3. TicketNFT
console.log(`📦 Deploying TicketNFT...`);
const ticketNFT = await viem.deployContract("TicketNFT", [ecoToken.address, transitAuthorityAddress]);

// 4. NFTMarketPlace
console.log(`📦 Deploying NFTMarketPlace...`);
const nftMarketPlace = await viem.deployContract("NFTMarketPlace", [ecoToken.address, govAddress, 5n]); // 5% fee

// 5. SmartBin
console.log(`📦 Deploying SmartBin...`);
const smartBin = await viem.deployContract("SmartBin", [productRegistry.address, ecoToken.address, oracleAddress, govAddress]);

// 6. MaterialAuction
console.log(`📦 Deploying MaterialAuction...`);
const materialAuction = await viem.deployContract("MaterialAuction", [govAddress, smartBin.address]);

// Initialize roles/configs
console.log(`⚙️  Initializing contract configurations...`);

// SmartBin needs to be registered in ProductRegistry to update status
await productRegistry.write.registerBin([smartBin.address]);

// The Oracle/Bin itself needs to be registered in SmartBin to call processDrop
await smartBin.write.registerBin([oracleAddress, "Main SmartBin Node 0", oracleAddress]);

// EcoToken needs to grant MINTER_ROLE to SmartBin
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c995d7a"; // keccak256("MINTER_ROLE")
await ecoToken.write.grantRole([MINTER_ROLE, smartBin.address]);


const deployedContracts = [
  { name: "ProductRegistry", address: productRegistry.address, abi: productRegistry.abi },
  { name: "EcoToken", address: ecoToken.address, abi: ecoToken.abi },
  { name: "TicketNFT", address: ticketNFT.address, abi: ticketNFT.abi },
  { name: "NFTMarketPlace", address: nftMarketPlace.address, abi: nftMarketPlace.abi },
  { name: "SmartBin", address: smartBin.address, abi: smartBin.abi },
  { name: "MaterialAuction", address: materialAuction.address, abi: materialAuction.abi },
];


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