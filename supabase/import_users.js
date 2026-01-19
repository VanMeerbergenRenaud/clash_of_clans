
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env file')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function importUsers() {
    try {
        const csvPath = path.join(__dirname, 'user.csv')
        const csvContent = await fs.readFile(csvPath, 'utf-8')

        // Simple CSV parser for this specific format
        const lines = csvContent.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())

        // Validate headers
        const expectedHeaders = ['uuid', 'username', 'email', 'password', 'user_type']
        if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
            throw new Error(`Invalid headers. Expected: ${expectedHeaders.join(',')}, Got: ${headers.join(',')}`)
        }

        // Fetch all users to check for existence (assuming small batch)
        const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (listError) console.error('Error listing users:', listError)

        console.log(`Found ${lines.length - 1} users in CSV.`)

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const values = line.split(',').map(v => v.trim())
            const user = {
                id: values[0],
                username: values[1],
                email: values[2],
                password: values[3],
                user_type: values[4]
            }

            console.log(`Processing user: ${user.username} (${user.email})`)

            let authUserId = null

            // Check if user already exists
            const existingUser = existingUsers?.find(u => u.email === user.email)

            if (existingUser) {
                console.log(`  - User exists in Auth with ID: ${existingUser.id}`)

                if (existingUser.id === user.id) {
                    console.log(`  - ID matches CSV. Using existing user.`)
                    authUserId = existingUser.id
                } else {
                    console.warn(`  - ID MISMATCH! Expected: ${user.id}, Got: ${existingUser.id}`)
                    console.warn(`  - Deleting existing user to recreate with correct ID...`)

                    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)
                    if (deleteError) {
                        console.error(`  - Failed to delete user: ${deleteError.message}`)
                        continue
                    }
                    console.log(`  - User deleted.`)
                }
            }

            // Create if not exists or deleted
            if (!authUserId) {
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    id: user.id, // Trying 'id' instead of 'uid'
                    email: user.email,
                    password: user.password,
                    email_confirm: true,
                    user_metadata: {
                        username: user.username
                    }
                })

                if (authError) {
                    console.error(`  - Error creating auth user: ${authError.message}`)
                    continue
                }

                authUserId = authData.user.id
                if (authUserId !== user.id) {
                    console.error(`  - CRITICAL: Created user ID (${authUserId}) does not match requested ID (${user.id}). Supabase might be ignoring the 'id' param.`)
                    // We can't proceed with insertion into public.users if the ID is wrong, unless we update the CSV ID logic?
                    // But the requirement is to use THESE UUIDs.
                } else {
                    console.log(`  - Auth user created successfully with correct ID.`)
                }
            }

            if (authUserId) {
                // 2. Insert or Update into public.users
                // Use upsert to handle potential partial failures where auth existed but profile didn't
                const { error: profileError } = await supabase
                    .from('users')
                    .upsert({
                        id: authUserId, // Use the ACTUAL auth ID
                        email: user.email,
                        username: user.username,
                        user_type: user.user_type,
                        updated_at: new Date().toISOString()
                    })

                if (profileError) {
                    console.error(`  - Error updating public profile: ${profileError.message}`)
                } else {
                    console.log(`  - Public profile updated successfully.`)
                }
            }
        }

        console.log('Import completed.')

    } catch (error) {
        console.error('Import failed:', error)
    }
}

importUsers()
