const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

/**
 * Admin Setup Script
 * Sets admin custom claims for specified users
 * 
 * Usage: node scripts/setAdminClaim.js <email>
 * Example: node scripts/setAdminClaim.js admin@fitribe.com
 */

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });
    
    console.log(`✅ Admin claim set for user: ${email}`);
    console.log(`   User ID: ${user.uid}`);
    console.log(`   
⚠️  Important: User must sign out and sign in again for changes to take effect.`);
    
    // Verify claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log(`   Custom Claims:`, updatedUser.customClaims);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`
💡 User not found. Please ensure:
   1. User has registered in the app
   2. Email is correct
   3. Firebase project is correct`);
    }
    
    process.exit(1);
  }
}

async function removeAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: false
    });
    
    console.log(`✅ Admin claim removed for user: ${email}`);
    console.log(`   User ID: ${user.uid}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing admin claim:', error.message);
    process.exit(1);
  }
}

async function listAdmins() {
  try {
    console.log('🔍 Fetching all admin users...\n');
    
    const listUsersResult = await admin.auth().listUsers();
    const admins = listUsersResult.users.filter(
      user => user.customClaims && user.customClaims.admin === true
    );
    
    if (admins.length === 0) {
      console.log('No admin users found.');
    } else {
      console.log(`Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
        console.log(`   UID: ${admin.uid}`);
        console.log(`   Created: ${new Date(admin.metadata.creationTime).toLocaleDateString()}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing admins:', error.message);
    process.exit(1);
  }
}

// ==================== MAIN ====================
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

if (!command) {
  console.log(`
📖 Admin Management Script

Usage:
  node scripts/setAdminClaim.js <command> <email>

Commands:
  set <email>       Set admin claim for user
  remove <email>    Remove admin claim from user
  list              List all admin users

Examples:
  node scripts/setAdminClaim.js set admin@fitribe.com
  node scripts/setAdminClaim.js remove user@example.com
  node scripts/setAdminClaim.js list
  `);
  process.exit(0);
}

switch (command.toLowerCase()) {
  case 'set':
    if (!email) {
      console.error('❌ Email required for set command');
      process.exit(1);
    }
    setAdminClaim(email);
    break;
    
  case 'remove':
    if (!email) {
      console.error('❌ Email required for remove command');
      process.exit(1);
    }
    removeAdminClaim(email);
    break;
    
  case 'list':
    listAdmins();
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Valid commands: set, remove, list');
    process.exit(1);
}