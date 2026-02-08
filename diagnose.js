/**
 * DIAGNOSTIC SCRIPT
 * Run this to find the exact problem
 * Usage: node diagnose.js
 */

console.log('🔍 Starting diagnostics...\n');

// Test 1: Check Node.js and file system
console.log('1️⃣ Node.js version:', process.version);
console.log('2️⃣ Current directory:', process.cwd());
console.log('3️⃣ Platform:', process.platform);
console.log('');

// Test 2: Check if files exist
const fs = require('fs');
const path = require('path');

const files = [
  'controllers/progressController.js',
  'controllers/challengeController.js',
  'controllers/badgeController.js',
  'services/progressService.js',
  'services/challengeService.js',
  'services/badgeService.js',
  'utils/progressUtils.js',
  'utils/challengeUtils.js',
  'utils/badgeUtils.js'
];

console.log('4️⃣ Checking file existence:');
files.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(exists ? '✅' : '❌', file);
});
console.log('');

// Test 3: Try to require each file
console.log('5️⃣ Testing imports:');

const testImports = [
  { name: 'progressUtils', path: './utils/progressUtils' },
  { name: 'challengeUtils', path: './utils/challengeUtils' },
  { name: 'badgeUtils', path: './utils/badgeUtils' },
];

testImports.forEach(({ name, path: filePath }) => {
  try {
    require(filePath);
    console.log('✅', name, '- imported successfully');
  } catch (err) {
    console.log('❌', name, '- FAILED:', err.message);
  }
});
console.log('');

// Test 4: Check for problematic characters in files
console.log('6️⃣ Checking for file corruption:');
files.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const hasNullBytes = content.includes('\0');
      const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content);
      
      if (hasNullBytes || hasInvalidChars) {
        console.log('❌', file, '- Contains invalid characters!');
      } else {
        console.log('✅', file, '- Clean');
      }
    } catch (err) {
      console.log('❌', file, '- Cannot read:', err.message);
    }
  }
});
console.log('');

// Test 5: Try importing services (most likely to fail)
console.log('7️⃣ Testing service imports:');

const services = [
  { name: 'progressService', path: './services/progressService' },
  { name: 'challengeService', path: './services/challengeService' },
  { name: 'badgeService', path: './services/badgeService' },
];

services.forEach(({ name, path: filePath }) => {
  try {
    require(filePath);
    console.log('✅', name, '- imported successfully');
  } catch (err) {
    console.log('❌', name, '- FAILED:', err.message);
    console.log('   Stack:', err.stack.split('\n')[1].trim());
  }
});
console.log('');

// Test 6: Try importing controllers
console.log('8️⃣ Testing controller imports:');

const controllers = [
  { name: 'progressController', path: './controllers/progressController' },
  { name: 'challengeController', path: './controllers/challengeController' },
  { name: 'badgeController', path: './controllers/badgeController' },
];

controllers.forEach(({ name, path: filePath }) => {
  try {
    require(filePath);
    console.log('✅', name, '- imported successfully');
  } catch (err) {
    console.log('❌', name, '- FAILED:', err.message);
    console.log('   Stack:', err.stack.split('\n')[1].trim());
  }
});
console.log('');

console.log('✅ Diagnostics complete!\n');
console.log('💡 If you see failures above, that\'s where the problem is.');
console.log('💡 The most common issue is file corruption during copy/paste.');
console.log('💡 Solution: Delete the failed files and re-download them.');