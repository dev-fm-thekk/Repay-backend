import { ethers } from "ethers";
import { generateNonce, SiweMessage } from "siwe";

async function generatePayload() {
    // 1. Create a random wallet for testing
    const wallet = ethers.Wallet.createRandom();
    
    // 2. The server gives you a nonce in step 1. For testing, we can generate a random one.
    // If you are calling your real server, replace this with the `nonce` returned by `GET /auth/nonce`.
    const nonce = generateNonce();

    // 3. Create the SIWE message using the same format the server expects.
    const message = new SiweMessage({
        domain: "localhost",
        address: wallet.address,
        statement: "Sign in with Ethereum to Repay",
        uri: "http://localhost",
        version: "1",
        chainId: 31337,
        nonce: nonce,
    });

    // Generate the raw text of the message to sign
    const messageText = message.prepareMessage();

    // 4. Sign the message text using the test wallet's private key
    const signature = await wallet.signMessage(messageText);

    // 5. Output the result formatted cleanly for copy-pasting into Postman
    console.log("=========================================");
    console.log("       POSTMAN TESTING PAYLOAD           ");
    console.log("=========================================");
    console.log("\nCopy and paste this entire JSON block into the 'Raw' body of your `POST /auth/login` request in Postman:");
    console.log("\n");
    console.log(JSON.stringify({
        message: message,
        signature: signature
    }, null, 2));

    console.log("\n");
    console.log("Testing Details:");
    console.log(`Wallet Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey} (Save this if you need to test operations like purchasing a ticket!)`);
    console.log("=========================================");
}

generatePayload().catch(console.error);
