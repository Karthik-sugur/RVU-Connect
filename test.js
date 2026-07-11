const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runTest() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'rvu-connect-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const db = testEnv.authenticatedContext('test-uid', { email: 'test@rvu.edu.in' }).firestore();

  // 1. Create a user document without the `suspended` field.
  // We use the unauthenticated admin context to bypass rules for setup.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await adminDb.doc('users/test-uid').set({
      email: 'test@rvu.edu.in',
      role: 'student',
      name: 'Test User',
      clubIds: [],
      interests: [],
      onboardingComplete: false,
      // intentionally missing 'suspended' field
    });
  });

  console.log("User document created successfully without 'suspended' field.");

  // 2. Try to update the user document as the user themselves.
  // According to rules: allow update: if isSuperAdmin() || (isRvuEmail() && isNotSuspended() && createsOwnDoc(uid) && ...)
  console.log("Attempting to update the user document (should fail because of isNotSuspended)...");
  
  try {
    await assertFails(db.doc('users/test-uid').update({
      name: 'Updated Name',
      updatedAt: '2026-07-11' // Simplified timestamp
    }));
    console.log("SUCCESS: The update was correctly denied by Firestore Rules.");
  } catch (error) {
    console.error("TEST FAILED: The update was NOT denied as expected.", error);
  }

  await testEnv.cleanup();
}

runTest().catch(console.error);
