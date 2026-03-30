import { expect, test, describe } from "bun:test";
import { SiweMessage, generateNonce } from "siwe";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config({ path: ".env.app" });

const API_ROOT = `http://localhost:${process.env.PORT || 8000}`;
const ADMIN_KEY = (process.env.SEPOLIA_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) as `0x${string}`;
const adminAccount = privateKeyToAccount(ADMIN_KEY);

describe("SIWE Robustness Tests", () => {
    
    async function getNonce() {
        const res = await fetch(`${API_ROOT}/auth/nonce`);
        const { nonce } = await res.json() as any;
        return nonce;
    }

    async function testLogin(account: any, message: any) {
        const nonce = await getNonce();
        const issuedAt = new Date().toISOString();
        
        let finalMessage = JSON.parse(JSON.stringify(message)); // deep copy
        // Ensure nonce and address matches
        if (typeof finalMessage === 'object') {
            finalMessage.nonce = nonce;
            finalMessage.address = account.address;
            finalMessage.issuedAt = issuedAt;
        }

        // If it was a string, we need to update it as well
        if (typeof message === 'string' && message.startsWith('{')) {
            const obj = JSON.parse(message);
            obj.nonce = nonce;
            obj.address = account.address;
            obj.issuedAt = issuedAt;
            finalMessage = JSON.stringify(obj);
        }

        const siweInstance = new SiweMessage(typeof finalMessage === 'string' ? JSON.parse(finalMessage) : finalMessage);
        const signature = await account.signMessage({
            message: siweInstance.prepareMessage(),
        });

        const res = await fetch(`${API_ROOT}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: finalMessage, signature }),
        });

        return res;
    }

    test("Login with SIWE object works", async () => {
        const message = {
            domain: "localhost",
            address: "", // filled in helper
            statement: "Sign in with Ethereum to Repay",
            uri: "http://localhost",
            version: "1",
            chainId: 11155111,
            nonce: "", // filled in helper
        };
        const res = await testLogin(adminAccount, message);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.success).toBe(true);
    });

    test("Login with JSON string of SIWE object works (ROBUSTNESS FIX)", async () => {
        const messageObj = {
            domain: "localhost",
            address: "", // filled in helper
            statement: "Sign in with Ethereum to Repay",
            uri: "http://localhost",
            version: "1",
            chainId: 11155111,
            nonce: "", // filled in helper
        };
        const messageJson = JSON.stringify(messageObj);
        const res = await testLogin(adminAccount, messageJson);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.success).toBe(true);
    });

    test("Login with 'would like you' returns helpful error", async () => {
        const badMessage = `RePay would like you to sign in with your Ethereum account:
0x742d35Cc6634C0532925a3b844Bc454e4438f44e

Sign in to access the RePay transport ecosystem.

Nonce: op3kdC6mOww3RXAmY`;
        
        const res = await fetch(`${API_ROOT}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: badMessage, signature: "0x" }),
        });

        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.error).toContain('wants you to sign in');
    });

    test("Login with single-line string returns newline error", async () => {
        const singleLine = "localhost wants you to sign in with your Ethereum account: 0x... Nonce: ...";
        
        const res = await fetch(`${API_ROOT}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: singleLine, signature: "0x" }),
        });

        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.error).toContain('missing required newlines');
    });
});
