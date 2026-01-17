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
    const { data: clans, error: clansError } = await client.from('tracked_clans').select('tag, name')

    if (clansError) {
        throw createError({
            statusCode: 500,
            statusMessage: clansError.message
        })
    }

    if (!clans || clans.length === 0) {
        // Log skipped
        await client.from('cron_logs').insert({
            task_name: 'record-leagues',
            status: 'skipped',
            message: 'Aucun clan suivi.',
            items_count: 0
        })
        return { message: 'Aucun clan suivi.' }
    }

    const results = []
    let updatedCount = 0

    for (const clan of clans) {
        const encodedTag = encodeURIComponent(clan.tag)

        try {
            // 2. Fetch CWL league group data
            const baseUrl = config.cocApiBaseUrl
            const leagueGroup: any = await $fetch(`${baseUrl}/clans/${encodedTag}/currentwar/leaguegroup`, {
                headers: {
                    Authorization: `Bearer ${cocToken}`,
                    Accept: 'application/json'
                }
            }).catch(() => null)

            if (!leagueGroup || !leagueGroup.season) {
                results.push({ tag: clan.tag, status: 'skipped (no CWL)' })
                continue
            }

            // Only record CWL when it has ended or when all rounds are complete
            // This prevents unnecessary DB writes during the 7-day CWL period
            const isEnded = leagueGroup.state === 'ended'
            const rounds = leagueGroup.rounds || []
            const allRoundsComplete = rounds.length === 7 && rounds.every((round: any) =>
                round.warTags?.every((tag: string) => tag !== '#0')
            )

            if (!isEnded && !allRoundsComplete) {
                const completedRounds = rounds.filter((r: any) =>
                    r.warTags?.every((tag: string) => tag !== '#0')
                ).length
                results.push({
                    tag: clan.tag,
                    status: `skipped (CWL in progress, ${completedRounds}/7 rounds complete)`
                })
                continue
            }

            // 3. Get clan's war league info
            const clanInfo: any = await $fetch(`${baseUrl}/clans/${encodedTag}`, {
                headers: {
                    Authorization: `Bearer ${cocToken}`,
                    Accept: 'application/json'
                }
            }).catch(() => null)

            const leagueData = {
                season: leagueGroup.season,
                clan_tag: clan.tag,
                clan_name: clan.name,
                league_name: clanInfo?.warLeague?.name || null,
                league_id: clanInfo?.warLeague?.id || null,
                state: leagueGroup.state === 'ended' ? 'ended' : 'inProgress',
                total_stars: 0,
                total_destruction: 0
            }

            // 4. Upsert League History
            const { data: savedLeague, error: leagueError } = await client
                .from('league_history')
                .upsert(leagueData, { onConflict: 'clan_tag, season' })
                .select()
                .single()

            if (leagueError) throw leagueError
            if (!savedLeague) throw new Error('Failed to save league data')

            // 5. Record all clans in the group
            const groupClansData = leagueGroup.clans?.map((c: any, index: number) => ({
                league_history_id: savedLeague.id,
                clan_tag: c.tag,
                clan_name: c.name,
                clan_level: c.clanLevel,
                badge_url: c.badgeUrls?.medium || null,
                group_rank: index + 1,
                total_stars: 0,
                total_destruction: 0
            })) || []

            if (groupClansData.length > 0) {
                const { error: clansUpsertError } = await client
                    .from('league_clans')
                    .upsert(groupClansData, { onConflict: 'league_history_id, clan_tag' })

                if (clansUpsertError) console.error('Error upserting league_clans:', clansUpsertError)
            }

            // 6. Process all war rounds to get player stats
            const playerStatsMap = new Map<string, any>()
            // Track best defense for each player across all rounds
            const defenseMap = new Map<string, { stars: number, destruction: number, attackerTag: string }>()
            let totalClanStars = 0
            let totalClanDestruction = 0

            for (const round of leagueGroup.rounds || []) {
                for (const warTag of round.warTags || []) {
                    if (warTag === '#0') continue // Skip placeholder wars

                    try {
                        const encodedWarTag = encodeURIComponent(warTag)
                        const warData: any = await $fetch(`${baseUrl}/clanwarleagues/wars/${encodedWarTag}`, {
                            headers: {
                                Authorization: `Bearer ${cocToken}`,
                                Accept: 'application/json'
                            }
                        })

                        // Find our clan in the war
                        const ourClan = warData.clan?.tag === clan.tag ? warData.clan :
                            warData.opponent?.tag === clan.tag ? warData.opponent : null
                        const opponentClan = warData.clan?.tag === clan.tag ? warData.opponent :
                            warData.opponent?.tag === clan.tag ? warData.clan : null

                        if (!ourClan || !ourClan.members) continue

                        // Determine the day (round index)
                        const roundIndex = leagueGroup.rounds.indexOf(round) + 1

                        // Process opponent attacks to track defenses
                        if (opponentClan && opponentClan.members) {
                            for (const oppMember of opponentClan.members) {
                                if (oppMember.attacks) {
                                    for (const attack of oppMember.attacks) {
                                        const defenderTag = attack.defenderTag
                                        const currentBest = defenseMap.get(defenderTag)

                                        // Track the BEST (highest stars/destruction) opponent attack against each of our players
                                        if (!currentBest ||
                                            attack.stars > currentBest.stars ||
                                            (attack.stars === currentBest.stars && attack.destructionPercentage > currentBest.destruction)) {
                                            defenseMap.set(defenderTag, {
                                                stars: attack.stars,
                                                destruction: attack.destructionPercentage,
                                                attackerTag: oppMember.tag
                                            })
                                        }
                                    }
                                }
                            }
                        }

                        // Process each member's attacks
                        for (const member of ourClan.members) {
                            const existing = playerStatsMap.get(member.tag) || {
                                player_tag: member.tag,
                                player_name: member.name,
                                town_hall_level: member.townhallLevel,
                                map_position: member.mapPosition,
                                total_stars: 0,
                                total_destruction: 0,
                                attacks_used: 0,
                                daily_attacks: []
                            }

                            if (member.attacks && member.attacks.length > 0) {
                                for (const attack of member.attacks) {
                                    existing.total_stars += attack.stars || 0
                                    existing.total_destruction += attack.destructionPercentage || 0
                                    existing.attacks_used += 1
                                    totalClanStars += attack.stars || 0
                                    totalClanDestruction += attack.destructionPercentage || 0

                                    existing.daily_attacks.push({
                                        day: roundIndex,
                                        stars: attack.stars,
                                        destruction: attack.destructionPercentage,
                                        opponent_tag: attack.defenderTag || null
                                    })
                                }
                            }

                            playerStatsMap.set(member.tag, existing)
                        }
                    } catch (err) {
                        // War might not be accessible yet
                        console.error(`Error fetching war ${warTag}:`, err)
                    }
                }
            }

            // 7. Update league history with totals
            await client
                .from('league_history')
                .update({
                    total_stars: totalClanStars,
                    total_destruction: totalClanDestruction,
                    updated_at: new Date().toISOString()
                })
                .eq('id', savedLeague.id)

            // 8. Upsert all participants with defense data
            const participantsData = Array.from(playerStatsMap.values()).map(p => {
                const defense = defenseMap.get(p.player_tag)
                return {
                    league_history_id: savedLeague.id,
                    ...p,
                    defense_stars: defense ? defense.stars : null,
                    defense_destruction: defense ? defense.destruction : null,
                    defense_attacker_tag: defense ? defense.attackerTag : null
                }
            })

            if (participantsData.length > 0) {
                const { error: partError } = await client
                    .from('league_participants')
                    .upsert(participantsData, { onConflict: 'league_history_id, player_tag' })

                if (partError) throw partError
            }

            results.push({
                tag: clan.tag,
                status: 'success',
                leagueId: savedLeague.id,
                season: savedLeague.season,
                participants: participantsData.length
            })

            // Count successful updates
            if (savedLeague) updatedCount++

        } catch (e: any) {
            console.error(`Error processing clan ${clan.tag}:`, e)
            results.push({ tag: clan.tag, error: e.message || 'Unknown error' })
        }
    }



    // Log final result
    await client.from('cron_logs').insert({
        task_name: 'record-leagues',
        status: 'success',
        message: `Processed ${clans.length} clans. Updated ${updatedCount} league seasons.`,
        items_count: updatedCount
    })

    return {
        success: true,
        results
    }
})
