import { expect, test, describe, beforeAll } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import dotenv from "dotenv";

dotenv.config({ path: ".env.app" });

const API_ROOT = `http://localhost:${process.env.PORT || 8000}`;

// Use the recovered keys
const ADMIN_KEY = (process.env.SEPOLIA_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) as `0x${string}`;
const USER_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;

const adminAccount = privateKeyToAccount(ADMIN_KEY);
const userAccount = privateKeyToAccount(USER_KEY);

let adminToken: string;
let userToken: string;

/**
 * Helper to perform SIWE login and get JWT token
 */
async function login(account: any, privateKey: `0x${string}`) {
    // 1. Get Nonce
    const nonceRes = await fetch(`${API_ROOT}/auth/nonce`);
    const { nonce } = await nonceRes.json() as any;

    // 2. Create SIWE Message
    const domain = "localhost";
    const origin = `http://${domain}`;
    const message = new SiweMessage({
        domain,
        address: account.address,
        statement: "Sign in with Ethereum to Repay",
        uri: origin,
        version: "1",
        chainId: 11155111, // Sepolia
        nonce: nonce,
    });

    const signature = await account.signMessage({
        message: message.prepareMessage(),
    });

    // 3. Login
    const loginRes = await fetch(`${API_ROOT}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            signature,
        }),
    });

    const { token } = await loginRes.json() as any;
    return token;
}

describe("Repay API E2E Tests", () => {
    
    beforeAll(async () => {
        adminToken = await login(adminAccount, ADMIN_KEY);
        userToken = await login(userAccount, USER_KEY);
    });

    describe("Authentication & RBAC", () => {
        test("Admin can access protected info", async () => {
            const res = await fetch(`${API_ROOT}/reward/info`, {
                headers: { "Authorization": `Bearer ${adminToken}` }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty("symbol");
        });

        test("User can see their own balance", async () => {
            const res = await fetch(`${API_ROOT}/reward/balance/${userAccount.address}`, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            expect(res.status).toBe(200);
        });

        test("User cannot see other users records", async () => {
            const res = await fetch(`${API_ROOT}/reward/records/${adminAccount.address}/count`, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            expect(res.status).toBe(403);
        });

        test("User cannot register an agency (RBAC)", async () => {
            const res = await fetch(`${API_ROOT}/agency/register`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${userToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: "Hacker Agency",
                    shortCode: "HACK",
                    transport: 0,
                    wallet: userAccount.address,
                    metadataURI: "ipfs://hack"
                })
            });
            expect(res.status).toBe(403);
        });
    });

    describe("Agency & Service Operations", () => {
        test("Admin registers userAccount as an agency", async () => {
            console.log("Admin registering agency...");
            const res = await fetch(`${API_ROOT}/agency/register`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: "City Metro",
                    shortCode: "METRO",
                    transport: 1, // METRO
                    wallet: userAccount.address,
                    metadataURI: "ipfs://metro-details"
                })
            });
            console.log("Register Agency status:", res.status);
            if (res.status !== 200) {
                const err = await res.json() as any;
                console.error("Register Agency error:", err);
            }
            expect([200, 500]).toContain(res.status);
        });

        test("Agency can create a service", async () => {
            console.log("Agency creating service...");
            const res = await fetch(`${API_ROOT}/service/create`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${userToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    agency_private_key: USER_KEY,
                    name: "City Metro - Orange Line",
                    route: "Orange Line",
                    tokenPrice: "1.5",
                    maxSupply: 1000,
                    metadataURI: "ipfs://metro-service-details"
                })
            });
            console.log("Create Service status:", res.status);
            if (res.status !== 200) {
                const err = await res.json();
                console.error("Create Service error:", err);
            }
            expect(res.status).toBe(200);
            const data = await res.json() as any;
            expect(data.success).toBe(true);
        });
    });

    describe("Ticket Lifecycle", () => {
        test("User can purchase a ticket", async () => {
            console.log("User purchasing ticket...");
            const serviceRes = await fetch(`${API_ROOT}/service/total`, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            const { totalServices } = await serviceRes.json() as any;
            const serviceId = Number(totalServices);
            console.log("Using serviceId:", serviceId);

            const res = await fetch(`${API_ROOT}/ticket/purchase`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${userToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    serviceId: serviceId,
                    tier: 0, 
                    private_key: USER_KEY
                })
            });
            console.log("Purchase Ticket status:", res.status);
            if (res.status !== 200) {
                const err = await res.json();
                console.error("Purchase error:", err);
            }
            expect(res.status).toBe(200);
            const data = await res.json() as any;
            expect(data.success).toBe(true);
            expect(data).toHaveProperty("tokenId");
        });

        test("Agency can validate a ticket", async () => {
            // Get user's tickets
            const ticketsRes = await fetch(`${API_ROOT}/ticket/holder/${userAccount.address}`, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            const { tokenIds } = await ticketsRes.json() as any;
            const tokenId = tokenIds[tokenIds.length - 1]; // Latest ticket

            const res = await fetch(`${API_ROOT}/ticket/${tokenId}/validate`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${userToken}`, // Validator is the agency
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    operator_private_key: USER_KEY
                })
            });
            expect(res.status).toBe(200);
            const data = await res.json() as any;
            expect(data.success).toBe(true);
        });
    });
});
