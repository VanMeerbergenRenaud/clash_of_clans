import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Ensure required environment variables are set for testing
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'COC_API_TOKEN'
]

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`⚠️  Warning: ${envVar} is not set. Some tests may fail.`)
    }
}

// Global test configuration
console.log('🧪 Test environment initialized')
console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? '✓ configured' : '✗ missing'}`)
console.log(`   COC API Token: ${process.env.COC_API_TOKEN ? '✓ configured' : '✗ missing'}`)
