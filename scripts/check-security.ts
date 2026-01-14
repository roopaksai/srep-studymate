/**
 * Security Configuration Checker
 * Run this script to validate your security configuration
 */

import { checkSecurityConfig } from '../lib/security'
import { config } from '../lib/config'

console.log('🔐 SREP StudyMate - Security Configuration Check\n')
console.log('='.repeat(60))

// Check security configuration
const securityCheck = checkSecurityConfig()

console.log('\n📋 Configuration Status:\n')

if (securityCheck.secure) {
  console.log('✅ All security checks passed!\n')
} else {
  console.log('❌ Security issues found:\n')
  securityCheck.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`)
  })
  console.log('\n')
}

// Check individual components
console.log('🔍 Detailed Component Check:\n')

// JWT Secret
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  console.log('❌ JWT_SECRET: Not configured')
} else if (jwtSecret.length < 32) {
  console.log(`⚠️  JWT_SECRET: Too weak (${jwtSecret.length} chars, need 32+)`)
} else if (jwtSecret === 'your-secret-key-change-in-production') {
  console.log('❌ JWT_SECRET: Using default value - CHANGE IMMEDIATELY!')
} else {
  console.log('✅ JWT_SECRET: Configured properly')
}

// MongoDB URI
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.log('❌ MONGODB_URI: Not configured')
} else if (mongoUri.includes('localhost')) {
  console.log('⚠️  MONGODB_URI: Using localhost (development only)')
} else {
  console.log('✅ MONGODB_URI: Configured')
}

// OpenRouter API Key
const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  console.log('❌ OPENROUTER_API_KEY: Not configured')
} else {
  console.log('✅ OPENROUTER_API_KEY: Configured')
}

// App URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL
const nodeEnv = process.env.NODE_ENV
if (!appUrl && nodeEnv === 'production') {
  console.log('⚠️  NEXT_PUBLIC_APP_URL: Not set (recommended for production)')
} else if (appUrl) {
  console.log(`✅ NEXT_PUBLIC_APP_URL: ${appUrl}`)
} else {
  console.log('ℹ️  NEXT_PUBLIC_APP_URL: Not set (OK for development)')
}

// Environment
console.log(`\n🌍 Environment: ${nodeEnv || 'development'}`)

console.log('\n' + '='.repeat(60))

if (!securityCheck.secure) {
  console.log('\n⚠️  Please fix the issues above before deploying to production!')
  console.log('📖 See docs/SECURITY.md for detailed security guide\n')
  process.exit(1)
} else {
  console.log('\n✅ Security configuration is good!')
  console.log('📖 Review docs/SECURITY.md for additional hardening steps\n')
  process.exit(0)
}
