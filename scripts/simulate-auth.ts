import { SiweMessage } from 'siwe';
import { privateKeyToAccount } from 'viem/accounts';

async function simulate() {
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const baseUrl = 'http://localhost:8000';

  console.log('1. Fetching Nonce...');
  const nonceRes = await fetch(`${baseUrl}/auth/nonce`);
  const { nonce } = await nonceRes.json() as { nonce: string };
  console.log(`   Nonce: ${nonce}`);

  console.log('\n2. Signing Message...');
  const siweMessage = new SiweMessage({
    domain: 'localhost:8000',
    address: account.address,
    statement: 'Sign in with Ethereum to Repay-backend',
    uri: baseUrl,
    version: '1',
    chainId: 1,
    nonce: nonce,
    issuedAt: new Date().toISOString(),
  });
  const message = siweMessage.prepareMessage();
  const signature = await account.signMessage({ message });

  console.log('\n3. Verifying with /auth/verify...');
  const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature }),
  });
  const verifyData = await verifyRes.json() as { token: string };
  
  if (!verifyData.token) {
    console.error('❌ Verification failed:', verifyData);
    return;
  }
  const token = verifyData.token;
  console.log('   Success! Token received.');

  console.log('\n4. Testing /profile with JWT...');
  const profileRes = await fetch(`${baseUrl}/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const profileData = await profileRes.json();
  
  if (profileRes.ok) {
    console.log('✅ Authentication simulation successful!');
    console.log('Result:', JSON.stringify(profileData, null, 2));
  } else {
    console.error('❌ Profile check failed:', profileData);
  }
}

simulate();
