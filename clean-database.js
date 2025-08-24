const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function cleanDatabase() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Get the models
    const User = require('./models/User');
    const Message = require('./models/Message');

    console.log('🗑️ Cleaning up database...');
    console.log('⚠️  This will permanently delete ALL data!');

    // Count existing data
    const userCount = await User.countDocuments();
    const messageCount = await Message.countDocuments();

    console.log(`📊 Current database state:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Messages: ${messageCount}`);

    if (userCount === 0 && messageCount === 0) {
      console.log('ℹ️ Database is already empty!');
      return;
    }

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('❓ Are you sure you want to delete ALL data? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled by user');
      return;
    }

    console.log('🗑️ Proceeding with database cleanup...');

    // Delete all messages first (to maintain referential integrity)
    const messageResult = await Message.deleteMany({});
    console.log(`✅ Deleted ${messageResult.deletedCount} messages`);

    // Delete all users
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} users`);

    // Verify cleanup
    const finalUserCount = await User.countDocuments();
    const finalMessageCount = await Message.countDocuments();

    console.log('🎉 Database cleanup completed successfully!');
    console.log(`📊 Final database state:`);
    console.log(`   Users: ${finalUserCount}`);
    console.log(`   Messages: ${finalMessageCount}`);
    console.log('💡 You can now start fresh with new user registrations.');

  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to reset specific collections
async function resetCollection(collectionName) {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    let Model;
    switch (collectionName.toLowerCase()) {
      case 'users':
        Model = require('./models/User');
        break;
      case 'messages':
        Model = require('./models/Message');
        break;
      default:
        console.log('❌ Invalid collection name. Use "users" or "messages"');
        return;
    }

    const count = await Model.countDocuments();
    console.log(`🗑️ Resetting ${collectionName} collection...`);
    console.log(`📊 Current ${collectionName}: ${count}`);

    if (count === 0) {
      console.log(`ℹ️ ${collectionName} collection is already empty!`);
      return;
    }

    const result = await Model.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} ${collectionName}`);

  } catch (error) {
    console.error(`❌ Error resetting ${collectionName}:`, error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to show database statistics
async function showDatabaseStats() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const User = require('./models/User');
    const Message = require('./models/Message');

    console.log('📊 Database Statistics');
    console.log('======================');

    const userCount = await User.countDocuments();
    const messageCount = await Message.countDocuments();

    console.log(`👥 Users: ${userCount}`);
    console.log(`💬 Messages: ${messageCount}`);

    if (userCount > 0) {
      console.log('\n👤 Recent Users:');
      const recentUsers = await User.find({}, 'username email createdAt lastSeen')
        .sort({ createdAt: -1 })
        .limit(5);
      
      recentUsers.forEach((user, index) => {
        const lastSeen = user.lastSeen ? user.lastSeen.toLocaleString() : 'Never';
        console.log(`   ${index + 1}. ${user.username} (${user.email})`);
        console.log(`      Created: ${user.createdAt.toLocaleString()}`);
        console.log(`      Last Seen: ${lastSeen}`);
      });
    }

    if (messageCount > 0) {
      console.log('\n💬 Recent Messages:');
      const recentMessages = await Message.find({}, 'text timestamp')
        .sort({ timestamp: -1 })
        .limit(5);
      
      recentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}`);
        console.log(`      Time: ${msg.timestamp.toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error getting database stats:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: clean entire database
    cleanDatabase();
  } else if (args[0] === '--collection' && args[1]) {
    // Reset specific collection
    resetCollection(args[1]);
  } else if (args[0] === '--stats') {
    // Show database statistics
    showDatabaseStats();
  } else if (args[0] === '--help') {
    console.log('🗑️ Database Cleanup Tool');
    console.log('========================');
    console.log('');
    console.log('Usage:');
    console.log('  node clean-database.js                    - Clean entire database');
    console.log('  node clean-database.js --collection <name> - Reset specific collection');
    console.log('  node clean-database.js --stats            - Show database statistics');
    console.log('  node clean-database.js --help             - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node clean-database.js');
    console.log('  node clean-database.js --collection users');
    console.log('  node clean-database.js --collection messages');
    console.log('  node clean-database.js --stats');
    console.log('');
    console.log('⚠️  WARNING: This tool permanently deletes data!');
    console.log('💡 Use with caution and ensure you have backups if needed.');
  } else {
    console.log('❌ Invalid arguments. Use --help for usage information.');
  }
}

module.exports = {
  cleanDatabase,
  resetCollection,
  showDatabaseStats
};
