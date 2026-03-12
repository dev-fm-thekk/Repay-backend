import { http, parseEther, createWalletClient, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import dotenv from "dotenv";

dotenv.config({ path: ".env.app" });

async function main() {
    const rpcUrl = "http://127.0.0.1:8545";
    const adminKey = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;
    const userKey = process.env.SEPOLIA_PRIVATE_KEY as `0x${string}`;
    
    const adminAccount = privateKeyToAccount(adminKey);
    const userAccount = privateKeyToAccount(userKey);
    
    const targetAddress = userAccount.address;
    const rewardTokenAddress = process.env.REWARD_TOKEN as `0x${string}`;
    const ticketNFTAddress = process.env.TICKET_NFT as `0x${string}`;

    const adminWallet = createWalletClient({
        account: adminAccount,
        chain: hardhat,
        transport: http(rpcUrl)
    });

    const userWallet = createWalletClient({
        account: userAccount,
        chain: hardhat,
        transport: http(rpcUrl)
    });

    const publicClient = createPublicClient({
        chain: hardhat,
        transport: http(rpcUrl)
    });

    console.log(`💸 Funding ${targetAddress} with ETH and RWDR tokens...`);

    // 1. Send ETH (Use a fresh account 0 to fund the admin if needed, or assume admin has ETH)
    // Actually, Hardhat Account 0 is the safest source for ETH.
    const hhAccount0Key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const hhAccount0 = privateKeyToAccount(hhAccount0Key);
    const hhWallet = createWalletClient({
        account: hhAccount0,
        chain: hardhat,
        transport: http(rpcUrl)
    });

    console.log("Funding admin and user with ETH from Hardhat Account 0...");
    await hhWallet.sendTransaction({ to: adminAccount.address, value: parseEther("100") });
    await hhWallet.sendTransaction({ to: userAccount.address, value: parseEther("100") });

    // 2. Mint Tokens
    const RewardTokenArtifact = (await import("../artifacts/contracts/reward.sol/RewardToken.json")).default;

    console.log(`🪙 Minting RWDR tokens for ${targetAddress}...`);
    const mintHash = await adminWallet.writeContract({
        address: rewardTokenAddress,
        abi: RewardTokenArtifact.abi,
        functionName: "mintReward",
        args: [
            targetAddress,
            "Test Funding",
            100n,
            0, // PLASTIC
            1000000n, // Plenty of tokens
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
    });
    console.log(`✅ Minted tokens. Hash: ${mintHash}`);

    // 3. Approval
    console.log(`🔓 Approving TicketNFT to spend tokens from ${targetAddress}...`);
    const approveHash = await userWallet.writeContract({
        address: rewardTokenAddress,
        abi: RewardTokenArtifact.abi,
        functionName: "approve",
        args: [ticketNFTAddress, parseEther("1000000")]
    });
    console.log(`✅ Approved. Hash: ${approveHash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
