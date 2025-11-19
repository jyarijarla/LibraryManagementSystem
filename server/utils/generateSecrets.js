#!/usr/bin/env node
/**
 * Security Secret Generator
 * 
 * Run this script to generate cryptographically secure random secrets
 * for your .env file. NEVER commit these secrets to version control.
 * 
 * Usage: node generateSecrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Cryptographically Secure Secrets...\n');
console.log('Copy these values to your .env file:\n');
console.log('=' .repeat(80));

// Generate AUTH_TOKEN_SECRET (64 bytes = 128 hex characters)
const authTokenSecret = crypto.randomBytes(64).toString('hex');
console.log(`\nAUTH_TOKEN_SECRET=${authTokenSecret}`);

// Generate REFRESH_TOKEN_SECRET (64 bytes)
const refreshTokenSecret = crypto.randomBytes(64).toString('hex');
console.log(`\nREFRESH_TOKEN_SECRET=${refreshTokenSecret}`);

// Generate SECRET_PEPPER (32 bytes)
const secretPepper = crypto.randomBytes(32).toString('hex');
console.log(`\nSECRET_PEPPER=${secretPepper}`);

// Generate ENCRYPTION_KEY (32 bytes for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log(`\nENCRYPTION_KEY=${encryptionKey}`);

// Generate SESSION_SECRET (64 bytes)
const sessionSecret = crypto.randomBytes(64).toString('hex');
console.log(`\nSESSION_SECRET=${sessionSecret}`);

console.log('\n' + '='.repeat(80));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. NEVER commit these secrets to Git or any version control');
console.log('   2. Store them securely (password manager, secure vault)');
console.log('   3. Use different secrets for development and production');
console.log('   4. Rotate secrets periodically (every 90 days recommended)');
console.log('   5. If secrets are compromised, regenerate immediately');
console.log('\n✅ Add .env to .gitignore to prevent accidental commits\n');


