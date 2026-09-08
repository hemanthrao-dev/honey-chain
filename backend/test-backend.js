import assert from 'assert';
import app from './src/server.js';

async function runTests() {
  const server = app.listen(5099, async () => {
    console.log('\n--- STARTING BACKEND SECURITY-FIRST TESTS ---');
    const baseUrl = 'http://localhost:5099/api';

    try {
      // 1. Health Check
      console.log('Test 1: Health check');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthData = await healthRes.json();
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthData.status, 'healthy');
      console.log('✓ Health check passed');

      // 2. Admin Login
      console.log('Test 2: Admin Login');
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'KVIC-ADMIN-01', password: 'AdminPassword123!' }),
      });
      const loginData = await loginRes.json();
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginData.user.role, 'admin');
      const adminToken = loginData.token;
      console.log('✓ Admin Login passed (Token & User verified)');

      // 3. Admin registers Beekeeper with assigned Hive IDs
      console.log('Test 3: Admin registers Beekeeper');
      const createBkRes = await fetch(`${baseUrl}/beekeepers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Sunita Devi',
          location: 'Sundarban Forest Buffer, Gosaba, West Bengal',
          hives: ['HIVE008', 'HIVE009'],
          rating: 4.9,
        }),
      });
      const createBkData = await createBkRes.json();
      assert.strictEqual(createBkRes.status, 201);
      assert.strictEqual(createBkData.data.name, 'Sunita Devi');
      const newBkId = createBkData.data.id;
      console.log(`✓ Admin Beekeeper registration passed: ${newBkId} with hives HIVE008, HIVE009`);

      // 4. Beekeeper Login
      console.log('Test 4: Beekeeper Login');
      const bkLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: newBkId, password: 'Beekeeper123!' }),
      });
      const bkLoginData = await bkLoginRes.json();
      assert.strictEqual(bkLoginRes.status, 200);
      assert.strictEqual(bkLoginData.user.role, 'beekeeper');
      const bkToken = bkLoginData.token;
      console.log('✓ Beekeeper Login passed');

      // 5. Beekeeper tries to use unassigned Hive (Security Rule Check)
      console.log('Test 5: Beekeeper unauthorized hive rejection');
      const unauthHiveRes = await fetch(`${baseUrl}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bkToken}`,
        },
        body: JSON.stringify({
          beekeeperId: newBkId,
          hiveId: 'HIVE999', // Not assigned!
          quantity: 20,
          floralSource: 'Wild Forest',
        }),
      });
      assert.strictEqual(unauthHiveRes.status, 403);
      console.log('✓ Unauthorized Hive ID registration rejected with 403');

      // 6. Beekeeper creates batch with assigned Hive
      console.log('Test 6: Beekeeper creates valid batch');
      const createBatchRes = await fetch(`${baseUrl}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bkToken}`,
        },
        body: JSON.stringify({
          beekeeperId: newBkId,
          hiveId: 'HIVE008',
          quantity: 22.5,
          floralSource: 'Wild Forest Honey',
          notes: 'Tested raw harvest from Sundarban',
        }),
      });
      const createBatchData = await createBatchRes.json();
      assert.strictEqual(createBatchRes.status, 201);
      assert.strictEqual(createBatchData.data.status, 'pending_review');
      assert.strictEqual(createBatchData.data.lab_tested, 0);
      const newBatchId = createBatchData.data.batch_id;
      console.log(`✓ Batch created on hash chain: ${newBatchId} (Status: pending_review)`);

      // 7. Admin Approves Batch & Generates Lab Code
      console.log('Test 7: Admin Approves Batch & Generates Code');
      const approveRes = await fetch(`${baseUrl}/batches/${newBatchId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      const approveData = await approveRes.json();
      assert.strictEqual(approveRes.status, 200);
      assert(approveData.verificationCode.startsWith('KVIC-'));
      const issuedCode = approveData.verificationCode;
      console.log(`✓ Admin approved batch. Issued single-use code: ${issuedCode}`);

      // 8. Beekeeper checks ready codes
      console.log('Test 8: Beekeeper views ready codes');
      const readyCodesRes = await fetch(`${baseUrl}/batches/ready-codes/${newBkId}`, {
        headers: { 'Authorization': `Bearer ${bkToken}` },
      });
      const readyCodesData = await readyCodesRes.json();
      assert.strictEqual(readyCodesRes.status, 200);
      assert(readyCodesData.data.some(c => c.batch_id === newBatchId));
      console.log('✓ Beekeeper ready codes endpoint confirmed');

      // 9. Beekeeper submits WRONG code (Mismatch check)
      console.log('Test 9: Invalid verification code submission');
      const wrongCodeRes = await fetch(`${baseUrl}/batches/${newBatchId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bkToken}`,
        },
        body: JSON.stringify({ code: 'KVIC-0000-0000' }),
      });
      assert.strictEqual(wrongCodeRes.status, 400);
      console.log('✓ Wrong code rejected with 400');

      // 10. Beekeeper submits CORRECT code
      console.log('Test 10: Correct single-use verification code submission');
      const correctCodeRes = await fetch(`${baseUrl}/batches/${newBatchId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bkToken}`,
        },
        body: JSON.stringify({ code: issuedCode }),
      });
      const correctCodeData = await correctCodeRes.json();
      assert.strictEqual(correctCodeRes.status, 200);
      assert.strictEqual(correctCodeData.status, 'KVIC Verified & Lab Tested');
      assert.strictEqual(correctCodeData.labTested, true);
      console.log('✓ Batch flipped to "KVIC Verified & Lab Tested"');

      // 11. Code Reuse Attempt (Single-use enforcement)
      console.log('Test 11: Code reuse attempt rejection');
      const reuseRes = await fetch(`${baseUrl}/batches/${newBatchId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bkToken}`,
        },
        body: JSON.stringify({ code: issuedCode }),
      });
      assert.strictEqual(reuseRes.status, 400);
      console.log('✓ Reused code rejected successfully');

      // 12. Consumer Public Verification & Integrity
      console.log('Test 12: Consumer Public QR / Batch Verification');
      const verifyRes = await fetch(`${baseUrl}/batches/verify/${newBatchId}`);
      const verifyData = await verifyRes.json();
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyData.data.status, 'KVIC Verified & Lab Tested');
      assert.strictEqual(verifyData.data.labTested, true);
      assert.strictEqual(verifyData.data.ledgerIntegrity.chainValid, true);
      console.log('✓ Consumer Verification Endpoint verified with intact SHA-256 ledger');

      // 13. Simulated Tampering Demonstration
      console.log('Test 13: Blockchain Tamper Detection Simulation');
      await fetch(`${baseUrl}/batches/${newBatchId}/tamper-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 999.9 }),
      });
      const tamperedCheckRes = await fetch(`${baseUrl}/batches/chain-status`);
      const tamperedCheckData = await tamperedCheckRes.json();
      assert.strictEqual(tamperedCheckData.data.valid, false);
      console.log(`✓ Tampering detected by blockchain ledger: ${tamperedCheckData.data.reason}`);

      // 14. Restore Chain
      console.log('Test 14: Blockchain Ledger Restoration');
      await fetch(`${baseUrl}/batches/restore-demo`, { method: 'POST' });
      const restoredCheckRes = await fetch(`${baseUrl}/batches/chain-status`);
      const restoredCheckData = await restoredCheckRes.json();
      assert.strictEqual(restoredCheckData.data.valid, true);
      console.log('✓ Blockchain Ledger successfully restored & re-validated');

      console.log('\n=============================================');
      console.log('🎉 ALL 14 BACKEND TESTS PASSED WITH 100% SUCCESS!');
      console.log('=============================================\n');
    } catch (err) {
      console.error('\n❌ TEST FAILED:', err);
      process.exit(1);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
