const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function clearAuthentication() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Get the User model
    const User = require('./models/User');

    console.log('🗑️ Clearing authentication data...');

    // Reset all users' lastSeen to current time (simulating logout)
    const updateResult = await User.updateMany(
      {}, 
      { 
        lastSeen: new Date(),
        $unset: { 
          refreshToken: 1,
          sessionToken: 1,
          deviceTokens: 1
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} users' authentication data`);
    console.log('🎉 Authentication cleanup completed successfully!');
    console.log('💡 All users have been marked as offline and tokens cleared.');

  } catch (error) {
    console.error('❌ Error clearing authentication:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to clear specific user's auth data
async function clearUserAuth(userId) {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const User = require('./models/User');

    console.log(`🗑️ Clearing authentication for user: ${userId}`);

    const updateResult = await User.findByIdAndUpdate(
      userId,
      { 
        lastSeen: new Date(),
        $unset: { 
          refreshToken: 1,
          sessionToken: 1,
          deviceTokens: 1
        }
      }
    );

    if (updateResult) {
      console.log(`✅ Authentication cleared for user: ${updateResult.username}`);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error clearing user authentication:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to list all users with their auth status
async function listUserAuthStatus() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const User = require('./models/User');

    console.log('📊 User Authentication Status:');
    console.log('================================');

    const users = await User.find({}, 'username email lastSeen createdAt');
    
    if (users.length === 0) {
      console.log('ℹ️ No users found in database');
    } else {
      users.forEach((user, index) => {
        const lastSeen = user.lastSeen ? user.lastSeen.toLocaleString() : 'Never';
        const created = user.createdAt.toLocaleString();
        
        console.log(`${index + 1}. ${user.username} (${user.email})`);
        console.log(`   Created: ${created}`);
        console.log(`   Last Seen: ${lastSeen}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('❌ Error listing user status:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: clear all authentication
    clearAuthentication();
  } else if (args[0] === '--user' && args[1]) {
    // Clear specific user auth
    clearUserAuth(args[1]);
  } else if (args[0] === '--status') {
    // List user auth status
    listUserAuthStatus();
  } else if (args[0] === '--help') {
    console.log('🔐 Authentication Cleanup Tool');
    console.log('==============================');
    console.log('');
    console.log('Usage:');
    console.log('  node clear-auth.js                    - Clear all user authentication');
    console.log('  node clear-auth.js --user <userId>    - Clear specific user authentication');
    console.log('  node clear-auth.js --status           - List all users auth status');
    console.log('  node clear-auth.js --help             - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node clear-auth.js');
    console.log('  node clear-auth.js --user 507f1f77bcf86cd799439011');
    console.log('  node clear-auth.js --status');
  } else {
    console.log('❌ Invalid arguments. Use --help for usage information.');
  }
}

module.exports = {
  clearAuthentication,
  clearUserAuth,
  listUserAuthStatus
};
