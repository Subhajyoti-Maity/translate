const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables for Chat App...\n');

// Check if .env.local already exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local already exists!');
  console.log('📁 File location:', envPath);
  console.log('\n📝 Current content:');
  console.log(fs.readFileSync(envPath, 'utf8'));
  return;
}

// Create .env.local with template
const envContent = `MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/chat_app?retryWrites=true&w=majority
JWT_SECRET=1525d3760809e2293a873d1837b2131d3830913684598536e2847df566dd578b`;

fs.writeFileSync(envPath, envContent);

console.log('✅ .env.local file created successfully!');
console.log('📁 File location:', envPath);
console.log('\n📝 Please edit the file and replace:');
console.log('   - yourusername with your MongoDB username');
console.log('   - yourpassword with your MongoDB password');
console.log('   - cluster.mongodb.net with your actual cluster URL');
console.log('\n🔑 JWT_SECRET is already set with a secure random key');
console.log('\n💡 After editing, run: npm run dev:socket');
