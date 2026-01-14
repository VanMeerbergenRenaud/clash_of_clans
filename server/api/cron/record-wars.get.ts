import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // Use Service Role to bypass RLS for administrative/cron tasks
    const client = serverSupabaseServiceRole(event)
    const config = useRuntimeConfig()
    const cocToken = config.cocApiToken

    if (!cocToken) {
        throw createError({
            statusCode: 500,
            statusMessage: 'COC_API_TOKEN is not configured'
        })
    }

    // 1. Get tracked clans to check
    const { data: clans, error: clansError } = await client.from('tracked_clans').select('tag')

    if (clansError) {
        throw createError({
            statusCode: 500,
            statusMessage: clansError.message
        })
    }

    if (!clans || clans.length === 0) {
        // Log skipped
        await client.from('cron_logs').insert({
            task_name: 'record-wars',
            status: 'skipped',
            message: 'Aucun clan suivi.',
            items_count: 0
        })
        return { message: 'Aucun clan suivi.' }
    }

    const results = []
    let updatedCount = 0

    // Helper to parse CoC Dates (YYYYMMDDTHHHmmss.000Z) to ISO
    const parseCocDate = (dateStr: string) => {
        if (!dateStr) return null
        // Format: 20231201T100000.000Z
        const pattern = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/
        const match = dateStr.match(pattern)
        if (!match) return new Date().toISOString() // Fallback
        return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`
    }

    for (const clan of clans) {
        const encodedTag = encodeURIComponent(clan.tag)

        try {
            // 2. Fetch current war data
            // We fetch directly from CoC API using the server token
            const war: any = await $fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`, {
                headers: {
                    Authorization: `Bearer ${cocToken}`,
                    Accept: 'application/json'
                }
            })

            // Skip if not in war or data invalid
            if (war.state === 'notInWar' || !war.opponent || !war.clan) {
                results.push({ tag: clan.tag, status: 'skipped (not in war)' })
                continue
            }

            // Check if we should record (e.g. war is ending soon or ended)
            // User said "1 minute before end". 
            // We'll allow recording at any time, using UPSERT to update stats as they evolve.
            // This allows the cron to run e.g. every 10 mins and capture the latest state.

            const warData = {
                team_size: war.teamSize,
                start_date: parseCocDate(war.startTime),
                end_date: parseCocDate(war.endTime),
                clan_tag: war.clan.tag,
                clan_name: war.clan.name,
                clan_stars: war.clan.stars,
                clan_destruction: war.clan.destructionPercentage,
                opponent_tag: war.opponent.tag,
                opponent_name: war.opponent.name,
                opponent_stars: war.opponent.stars,
                opponent_destruction: war.opponent.destructionPercentage,
                result: war.state === 'warEnded'
                    ? (war.clan.stars > war.opponent.stars
                        ? 'win'
                        : (war.clan.stars < war.opponent.stars ? 'lose' : (war.clan.destructionPercentage > war.opponent.destructionPercentage ? 'win' : (war.clan.destructionPercentage < war.opponent.destructionPercentage ? 'lose' : 'tie')))
                    )
                    : null
            }

            // 3. Upsert War History
            // We assume a UNIQUE constraint on (clan_tag, end_date) in the database to handle upserts
            const { data: savedWar, error: warError } = await client
                .from('war_history') // @ts-ignore
                .upsert(warData, { onConflict: 'clan_tag, end_date' })
                .select()
                .single()

            if (warError) {
                throw warError
            }

            if (!savedWar) {
                throw new Error('Failed to save war data')
            }

            // 4. Record Participants
            const members = war.clan.members || []
            const participantsData = members.map((m: any) => ({
                war_id: savedWar.id,
                player_tag: m.tag,
                player_name: m.name,
                stars: m.attacks ? m.attacks.reduce((acc: number, atk: any) => acc + atk.stars, 0) : 0,
                destruction: m.attacks ? m.attacks.reduce((acc: number, atk: any) => acc + atk.destructionPercentage, 0) : 0,
                attacks_count: m.attacks ? m.attacks.length : 0,
                town_hall_level: m.townhallLevel,
                map_position: m.mapPosition
            }))

            if (participantsData.length > 0) {
                const { error: partError } = await client
                    .from('war_participants') // @ts-ignore
                    .upsert(participantsData, { onConflict: 'war_id, player_tag' })

                if (partError) throw partError
            }

            // Count successful updates
            if (savedWar) updatedCount++
            results.push({ tag: clan.tag, status: 'success', warId: savedWar.id })

        } catch (e: any) {
            console.error(`Error processing clan ${clan.tag}:`, e)
            results.push({ tag: clan.tag, error: e.message || 'Unknown error' })
        }
    }



    // Log final result
    await client.from('cron_logs').insert({
        task_name: 'record-wars',
        status: 'success',
        message: `Processed ${clans.length} clans. Updated ${updatedCount} wars.`,
        items_count: updatedCount
    })

    return {
        success: true,
        results
    }
})
