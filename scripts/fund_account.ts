import { network } from "hardhat";
import { parseEther } from "viem";
import dotenv from "dotenv";

dotenv.config({ path: ".env.app" });

async function main() {
    const { viem } = await network.connect();
    const [admin] = await viem.getWalletClients();
    const targetAddress = "0x18422192C052F4b70D1303FA4E5E3d84B9805556";

    console.log(`💸 Funding ${targetAddress} from ${admin.account.address}...`);

    const hash = await admin.sendTransaction({
        to: targetAddress as `0x${string}`,
        value: parseEther("100")
    });

    console.log(`✅ Sent 100 ETH. Hash: ${hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
