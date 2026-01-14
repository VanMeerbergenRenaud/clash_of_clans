import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // Use Service Role to bypass RLS for administrative tasks
    const client = serverSupabaseServiceRole(event)

    // 1. Mock Data (Fake War)
    // We simulate a completed war that just finished
    const fakeWarData = {
        team_size: 5,
        start_date: new Date(Date.now() - 172800000).toISOString(), // Started 48h ago
        end_date: new Date().toISOString(), // Ends now (unique key component)
        clan_tag: '#TEST_SIM_CLAN',
        clan_name: 'Simulation Team',
        clan_stars: 15,
        clan_destruction: 100.0,
        opponent_tag: '#TEST_SIM_OPP',
        opponent_name: 'Target Dummy',
        opponent_stars: 10,
        opponent_destruction: 60.5,
        result: 'win'
    }

    try {
        // 2. Insert War History
        const { data: savedWar, error: warError } = await client
            .from('war_history')
            .upsert(fakeWarData, { onConflict: 'clan_tag, end_date' })
            .select()
            .single()

        if (warError) throw new Error(`Error inserting war_history: ${warError.message} (${warError.details})`)
        if (!savedWar) throw new Error('No data returned from war_history insert')

        // 3. Mock Participants
        const fakeParticipants = [
            {
                war_id: savedWar.id,
                player_tag: '#SIM_P1',
                player_name: 'Simulated Pro',
                stars: 6,
                destruction: 200, // 2 attacks 100%
                attacks_count: 2,
                town_hall_level: 16,
                map_position: 1
            },
            {
                war_id: savedWar.id,
                player_tag: '#SIM_P2',
                player_name: 'Simulated Noob',
                stars: 0,
                destruction: 45,
                attacks_count: 1,
                town_hall_level: 15,
                map_position: 2
            }
        ]

        const { error: partError } = await client
            .from('war_participants')
            .upsert(fakeParticipants, { onConflict: 'war_id, player_tag' })

        if (partError) throw new Error(`Error inserting war_participants: ${partError.message}`)

        return {
            success: true,
            message: '✅ Simulation réussie ! Données insérées en base pour le clan #TEST_SIM_CLAN.',
            war_entry: savedWar,
            participants_count: fakeParticipants.length
        }

    } catch (err: any) {
        return {
            success: false,
            error: err.message
        }
    }
})
