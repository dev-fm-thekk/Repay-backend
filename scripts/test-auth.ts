import { SiweMessage } from 'siwe';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Helper script to generate a SIWE message and signature for testing.
 * Usage: bun run scripts/test-auth.ts <NONCE>
 */

const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat #0
const account = privateKeyToAccount(PRIVATE_KEY);

const nonce = process.argv[2];

if (!nonce) {
  console.error('❌ Error: Please provide a nonce from http://localhost:8000/auth/nonce');
  console.log('Usage: bun run scripts/test-auth.ts <NONCE>');
  process.exit(1);
}

const domain = 'localhost:8000';
const origin = 'http://localhost:8000';

const siweMessage = new SiweMessage({
  domain,
  address: account.address,
  statement: 'Sign in with Ethereum to Repay-backend',
  uri: origin,
  version: '1',
  chainId: 1,
  nonce: nonce,
  issuedAt: new Date().toISOString(),
});

const message = siweMessage.prepareMessage();
const signature = await account.signMessage({ message });

console.log('\n✅ SIWE Test Data Generated');
console.log('--------------------------------------------------');
console.log('Postman POST /auth/verify JSON Body:');
console.log(JSON.stringify({
  message,
  signature
}, null, 2));
console.log('--------------------------------------------------\n');
