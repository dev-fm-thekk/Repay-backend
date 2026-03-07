import { createWalletClient, createPublicClient, http, keccak256, stringToBytes, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";

/**
 * REPAY Minting Test & System Repair (Mined Blocks Version)
 */

const RPC_URL = "http://localhost:8545";
const ADMIN_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const USER_WALLET = "0x18422192C052F4b70D1303FA4E5E3d84B9805556";
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c995d7a";

const Hardhat = defineChain({ 
  id: 31337, 
  name: 'Hardhat', 
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, 
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } } 
});

const artifactsDir = path.join(process.cwd(), "artifacts");
const latestFile = fs.readdirSync(artifactsDir).filter(f => f.match(/^v\d+\.json$/)).sort((a,b) => parseInt(b.slice(1)) - parseInt(a.slice(1)))[0];
const artifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, latestFile), "utf8"));
const getContract = (name: string) => artifact.contracts.find((c: any) => c.name === name);

const SmartBin = getContract("SmartBin");
const EcoToken = getContract("EcoToken");
const ProductRegistry = getContract("ProductRegistry");

async function waitTx(wal: any, pub: any, hash: any) {
    console.log(`   Pending: ${hash}`);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    console.log(`   Confirmed in block: ${receipt.blockNumber}`);
    return receipt;
}

async function run() {
    const account = privateKeyToAccount(ADMIN_PK as `0x${string}`);
    const pub = createPublicClient({ chain: Hardhat, transport: http(RPC_URL) });
    const wal = createWalletClient({ account, chain: Hardhat, transport: http(RPC_URL) });

    console.log(`🚀 Starting Robust Setup for ${USER_WALLET}...`);

    try {
        // 1. Permissions
        console.log("1. Granting MINTER_ROLE to SmartBin...");
        const h1 = await wal.writeContract({ address: EcoToken.address, abi: EcoToken.abi, functionName: 'grantRole', args: [MINTER_ROLE, SmartBin.address] });
        await waitTx(wal, pub, h1);

        console.log("2. Registering SmartBin in ProductRegistry...");
        const h2 = await wal.writeContract({ address: ProductRegistry.address, abi: ProductRegistry.abi, functionName: 'registerBin', args: [SmartBin.address] });
        await waitTx(wal, pub, h2);

        // 2. Company Setup
        console.log("3. Setup Company...");
        try {
            const h3a = await wal.writeContract({ address: ProductRegistry.address, abi: ProductRegistry.abi, functionName: 'registerCompany', args: ["Test Eco Co", account.address] });
            await waitTx(wal, pub, h3a);
        } catch (e: any) {
            console.log("   (Company likely already registered)");
        }
        const h3b = await wal.writeContract({ address: ProductRegistry.address, abi: ProductRegistry.abi, functionName: 'verifyCompany', args: [account.address] });
        await waitTx(wal, pub, h3b);

        // 3. Product Setup
        console.log("4. Registering Product...");
        const h4 = await wal.writeContract({ address: ProductRegistry.address, abi: ProductRegistry.abi, functionName: 'registerProduct', args: [account.address, "Eco-Soda", "metal-can", "ipfs://test-meta"] });
        await waitTx(wal, pub, h4);

        const productId = await pub.readContract({ address: ProductRegistry.address, abi: ProductRegistry.abi, functionName: 'productCounter' }) as bigint;
        console.log(`   Product ID created: ${productId}`);

        // 4. SmartBin Config
        console.log("5. Configuring AI Oracle and Bin Node...");
        const h5a = await wal.writeContract({ address: SmartBin.address, abi: SmartBin.abi, functionName: 'updateOracle', args: [account.address] });
        await waitTx(wal, pub, h5a);
        const h5b = await wal.writeContract({ address: SmartBin.address, abi: SmartBin.abi, functionName: 'registerBin', args: [account.address, "Local Lab Node", account.address] });
        await waitTx(wal, pub, h5b);

        // 5. THE MINT
        console.log(`6. SIMULATING MINT: Drop Product #${productId} to ${USER_WALLET}...`);
        try {
            await pub.simulateContract({
                address: SmartBin.address, abi: SmartBin.abi,
                functionName: 'processDrop',
                args: [
                    productId, 
                    USER_WALLET as `0x${string}`, 
                    5000n, 
                    "metal-can",
                    100n,
                    keccak256(stringToBytes(`proof-${Date.now()}`))
                ]
            });
            console.log("   Simulation successful!");
        } catch (simErr: any) {
            console.error("   Simulation FAILED:", simErr.message);
            throw simErr;
        }

        console.log(`7. EXECUTING MINT...`);
        const h6 = await wal.writeContract({
            address: SmartBin.address, abi: SmartBin.abi,
            functionName: 'processDrop',
            args: [
                productId, 
                USER_WALLET as `0x${string}`, 
                5000n, 
                "metal-can",
                100n,
                keccak256(stringToBytes(`proof-${Date.now()}`))
            ]
        });
        await waitTx(wal, pub, h6);

        console.log("\n✅ ALL STEPS COMPLETE.");
        const balance = await pub.readContract({ address: EcoToken.address, abi: EcoToken.abi, functionName: 'balanceOf', args: [USER_WALLET as `0x${string}`] }) as bigint;
        console.log(`🎉 New Wallet Balance: ${Number(balance)/1e18} ECO`);

    } catch (err: any) {
        console.error("\n❌ ERROR during execution:");
        console.error(err.message || err);
    }
}

run().catch(console.error);
