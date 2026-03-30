import { 
    createPublicClient, 
    createWalletClient, 
    http, 
    parseUnits, 
    Hex, 
    Address,
    getContract
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { AgencyRegistryAbi, ServiceRegistryAbi } from '../server/abi.js';

dotenv.config({ path: '.env.app' });

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const ADMIN_PRIVATE_KEY = (process.env.SEPOLIA_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) as Hex;
const AGENCY_REGISTRY = process.env.AGENCY_REGISTRY as Address;
const SERVICE_REGISTRY = process.env.SERVICE_REGISTRY as Address;

if (!SEPOLIA_RPC_URL || !ADMIN_PRIVATE_KEY || !AGENCY_REGISTRY || !SERVICE_REGISTRY) {
    console.error("Missing environment variables in .env.app");
    process.exit(1);
}

const chain = sepolia;
const adminAccount = privateKeyToAccount(ADMIN_PRIVATE_KEY);

const publicClient = createPublicClient({
    chain,
    transport: http(SEPOLIA_RPC_URL)
});

const adminWalletClient = createWalletClient({
    account: adminAccount,
    chain,
    transport: http(SEPOLIA_RPC_URL)
});

async function main() {
    console.log(`Starting data seeding with admin: ${adminAccount.address}`);

    const agencies = [
        {
            name: "Delhi Transport Corporation",
            shortCode: "DTC",
            transport: 0, // BUS
            metadataURI: "ipfs://dtc-metadata",
            services: [
                { name: "GL-12 Local", route: "GL-12", price: "5", supply: 0 },
                { name: "502 Express", route: "502", price: "15", supply: 500 },
                { name: "Airport Express Bus", route: "AIR-1", price: "25", supply: 100 }
            ]
        },
        {
            name: "Delhi Metro Rail Corporation",
            shortCode: "DMRC",
            transport: 1, // METRO
            metadataURI: "ipfs://dmrc-metadata",
            services: [
                { name: "Yellow Line Token", route: "Yellow-L", price: "20", supply: 0 },
                { name: "Blue Line Token", route: "Blue-L", price: "30", supply: 0 },
                { name: "Tourist Pass (1 Day)", route: "TP-1D", price: "150", supply: 1000 }
            ]
        },
        {
            name: "Indian Railways",
            shortCode: "IR",
            transport: 2, // TRAIN
            metadataURI: "ipfs://ir-metadata",
            services: [
                { name: "Sleeper Class", route: "NDLS-MUM", price: "80", supply: 100 },
                { name: "3AC Tier", route: "NDLS-MUM", price: "200", supply: 50 },
                { name: "Shatabdi Express", route: "NDLS-BPL", price: "350", supply: 40 }
            ]
        }
    ];

    for (const agencyData of agencies) {
        console.log(`\n--- Registering Agency: ${agencyData.name} ---`);
        
        // Generate a unique wallet for each agency
        const agencyPrivateKey = generatePrivateKey();
        const agencyAccount = privateKeyToAccount(agencyPrivateKey);
        
        console.log(`Agency Wallet: ${agencyAccount.address}`);
        console.log(`Agency Private Key: ${agencyPrivateKey}`);

        try {
            // 1. Admin registers the agency
            const { request: regReq } = await publicClient.simulateContract({
                account: adminAccount,
                address: AGENCY_REGISTRY,
                abi: AgencyRegistryAbi,
                functionName: 'registerAgency',
                args: [
                    agencyData.name,
                    agencyData.shortCode,
                    agencyData.transport,
                    agencyAccount.address,
                    agencyData.metadataURI
                ]
            });

            const regHash = await adminWalletClient.writeContract(regReq);
            console.log(`Registration Transaction: ${regHash}`);
            await publicClient.waitForTransactionReceipt({ hash: regHash });
            console.log(`Agency registered!`);

            // 2. Fund the agency account so it can create services
            console.log(`Funding agency account with 0.01 Sepolia ETH...`);
            const fundHash = await adminWalletClient.sendTransaction({
                to: agencyAccount.address,
                value: parseUnits('0.01', 18)
            });
            await publicClient.waitForTransactionReceipt({ hash: fundHash });

            // 3. Create services for the agency
            const agencyWalletClient = createWalletClient({
                account: agencyAccount,
                chain,
                transport: http(SEPOLIA_RPC_URL)
            });

            for (const serviceData of agencyData.services) {
                console.log(`Creating Service: ${serviceData.name} (${serviceData.price} tokens)`);
                
                const { request: servReq } = await publicClient.simulateContract({
                    account: agencyAccount,
                    address: SERVICE_REGISTRY,
                    abi: ServiceRegistryAbi,
                    functionName: 'createService',
                    args: [
                        serviceData.name,
                        serviceData.route,
                        parseUnits(serviceData.price, 18),
                        BigInt(serviceData.supply),
                        `ipfs://${agencyData.shortCode.toLowerCase()}-${serviceData.route.toLowerCase()}`
                    ]
                });

                const servHash = await agencyWalletClient.writeContract(servReq);
                console.log(`Service Creation Transaction: ${servHash}`);
                await publicClient.waitForTransactionReceipt({ hash: servHash });
                console.log(`Service created!`);
            }
        } catch (error: any) {
            console.error(`Error processing agency ${agencyData.name}:`, error.message);
        }
    }

    console.log("\nSeeding complete!");
}

main().catch(console.error);
