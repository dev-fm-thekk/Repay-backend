import { network } from "hardhat";
import { http, parseEther } from "viem";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, localhost } from "viem/chains";

dotenv.config({ path: ".env.app" });

async function main() {
    const { viem } = await network.connect();
    const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    const [admin] = await viem.getWalletClients({
        account: account,
        chain: hardhat,
        transport: http("http://127.0.0.1:8545")
    });
    const targetAddress = "0xA87fd5C0EE110cEAA1939C01C1D8623ac4417A2f";

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
