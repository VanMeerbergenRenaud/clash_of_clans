
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkRLS() {
    // We can't run raw SQL from JS client easily without a stored procedure, 
    // BUT we can use the 'postgres' package if installed, OR just try to read from the table as a normal user.
    // If I can't read as a normal user, RLS is blocking.

    // Let's emulate the fetchUserProfile call as the 'padawan' user.

    // 1. Sign in as padawan
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'padawan@clashofclans.com',
        password: 'password'
    })

    if (loginError) {
        console.error('Login failed:', loginError)
        return
    }

    console.log('Logged in as Padawan:', session.user.id)

    // 2. Try to read own profile using the SAME client (authenticated)
    // We need a client that uses the USER token, not service role
    const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_KEY || '', {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    })

    const { data, error } = await userClient
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

    if (error) {
        console.error('RLS CHECK FAILED. Error reading own profile:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
    } else {
        console.log('RLS CHECK PASSED. Profile data:', data)
    }
}

checkRLS()
