import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // Use Service Role to bypass RLS for administrative/cron tasks
    // Note: Using 'any' cast because Nuxt Supabase module doesn't properly infer Database types
    const client: any = serverSupabaseServiceRole(event)
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

    const results: any[] = []
    let updatedCount = 0

    for (const clan of clans) {
        const encodedTag = encodeURIComponent(clan.tag)
        const clanTag = clan.tag.toUpperCase() // Normalize tag case
        const clanWarnings: string[] = []

        try {
            // 2. Fetch CWL league group data
            const baseUrl = config.cocApiBaseUrl
            let leagueGroup: any = null
            try {
                leagueGroup = await $fetch(`${baseUrl}/clans/${encodedTag}/currentwar/leaguegroup`, {
                    headers: {
                        Authorization: `Bearer ${cocToken}`,
                        Accept: 'application/json'
                    }
                })
            } catch (e: any) {
                // If it's 404, it just means no league. Other errors are real errors.
                if (e.statusCode !== 404) {
                    console.error(`Error fetching league group for ${clanTag}:`, e)
                    results.push({ tag: clanTag, error: `Fetch error: ${e.message}` })
                    continue
                }
            }

            if (!leagueGroup || !leagueGroup.season) {
                results.push({ tag: clanTag, status: 'skipped (no CWL)' })
                continue
            }

            // Record CWL data at every execution, regardless of state
            // This allows flexible cron execution (daily, hourly, etc.)
            const isEnded = leagueGroup.state === 'ended'

            // 3. Get clan's war league info
            let clanInfo: any = null
            try {
                clanInfo = await $fetch(`${baseUrl}/clans/${encodedTag}`, {
                    headers: {
                        Authorization: `Bearer ${cocToken}`,
                        Accept: 'application/json'
                    }
                })
            } catch (e: any) {
                console.error(`Error fetching clan info for ${clanTag}:`, e)
                clanWarnings.push(`Failed to fetch clan info: ${e.message}`)
            }

            const leagueData = {
                season: leagueGroup.season,
                clan_tag: clanTag,
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
                clan_tag: c.tag.toUpperCase(), // Normalize
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
            let warsProcessed = 0

            // Track stats for ALL clans in the group for ranking
            const groupClanStatsMap = new Map<string, { stars: number, destruction: number }>()
            // Initialize all group clans with 0 stats
            for (const groupClan of leagueGroup.clans || []) {
                groupClanStatsMap.set(groupClan.tag.toUpperCase(), { stars: 0, destruction: 0 })
            }

            const allWarTags = (leagueGroup.rounds || []).flatMap((r: any) => r.warTags || [])
            const warsToFetch = allWarTags.filter((tag: string) => tag !== '#0')

            // Fetch wars in parallel (limit parallelism if needed, but 28 requests should be fine for CoC API)
            const warResults = await Promise.all(warsToFetch.map(async (warTag: string) => {
                try {
                    const encodedWarTag = encodeURIComponent(warTag)
                    const warData: any = await $fetch(`${baseUrl}/clanwarleagues/wars/${encodedWarTag}`, {
                        headers: {
                            Authorization: `Bearer ${cocToken}`,
                            Accept: 'application/json'
                        }
                    })
                    return { warTag, warData }
                } catch (err: any) {
                    console.error(`Error fetching war ${warTag}:`, err)
                    return { warTag, error: err.message }
                }
            }))

            for (const res of warResults) {
                if (res.error) {
                    clanWarnings.push(`Error fetching war ${res.warTag}: ${res.error}`)
                    continue
                }

                const warData = res.warData
                warsProcessed++

                // 6a. Calculate stats for both clans to determine winner
                const clan1 = warData.clan
                const clan2 = warData.opponent

                if (clan1 && clan2) {
                    const clan1Tag = clan1.tag.toUpperCase()
                    const clan2Tag = clan2.tag.toUpperCase()

                    const calcWarStats = (clan: any) => {
                        let stars = 0
                        let dest = 0
                        if (clan.members) {
                            for (const m of clan.members) {
                                if (m.attacks) {
                                    for (const a of m.attacks) {
                                        stars += a.stars || 0
                                        dest += a.destructionPercentage || 0
                                    }
                                }
                            }
                        }
                        return { stars, dest }
                    }

                    const s1 = calcWarStats(clan1)
                    const s2 = calcWarStats(clan2)

                    // Win condition
                    const clan1Wins = s1.stars > s2.stars || (s1.stars === s2.stars && s1.dest > s2.dest)
                    const clan2Wins = s2.stars > s1.stars || (s2.stars === s1.stars && s2.dest > s1.dest)

                    const bonus1 = clan1Wins ? 10 : 0
                    const bonus2 = clan2Wins ? 10 : 0

                    // Update group stats map
                    const updateGroupStats = (tag: string, stars: number, dest: number) => {
                        const existing = groupClanStatsMap.get(tag)
                        if (existing) {
                            groupClanStatsMap.set(tag, {
                                stars: existing.stars + stars,
                                destruction: existing.destruction + dest
                            })
                        } else {
                            const msg = `Clan ${tag} not found in map (War: ${res.warTag})`
                            if (!clanWarnings.includes(msg)) clanWarnings.push(msg)
                        }
                    }

                    updateGroupStats(clan1Tag, s1.stars + bonus1, s1.dest)
                    updateGroupStats(clan2Tag, s2.stars + bonus2, s2.dest)

                    // Track defenses for our clan
                    const ourClanObj = clan1Tag === clanTag ? clan1 : (clan2Tag === clanTag ? clan2 : null)
                    const opponentClanObj = clan1Tag === clanTag ? clan2 : (clan2Tag === clanTag ? clan1 : null)

                    if (ourClanObj && opponentClanObj && opponentClanObj.members) {
                        for (const oppMember of opponentClanObj.members) {
                            if (oppMember.attacks) {
                                for (const attack of oppMember.attacks) {
                                    const defenderTag = attack.defenderTag
                                    const currentBest = defenseMap.get(defenderTag)
                                    if (!currentBest || attack.stars > currentBest.stars || (attack.stars === currentBest.stars && attack.destructionPercentage > currentBest.destruction)) {
                                        defenseMap.set(defenderTag, { stars: attack.stars, destruction: attack.destructionPercentage, attackerTag: oppMember.tag })
                                    }
                                }
                            }
                        }
                    }

                    // Process members of our clan for participant stats
                    if (ourClanObj && ourClanObj.members) {
                        const roundIndex = leagueGroup.rounds.findIndex((r: any) => r.warTags?.includes(res.warTag)) + 1
                        for (const member of ourClanObj.members) {
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

                            if (member.attacks) {
                                for (const attack of member.attacks) {
                                    existing.total_stars += attack.stars || 0
                                    existing.total_destruction += attack.destructionPercentage || 0
                                    existing.attacks_used += 1
                                    totalClanStars += attack.stars || 0
                                    totalClanDestruction += attack.destructionPercentage || 0
                                    existing.daily_attacks.push({ day: roundIndex, stars: attack.stars, destruction: attack.destructionPercentage, opponent_tag: attack.defenderTag || null })
                                }
                            }
                            playerStatsMap.set(member.tag, existing)
                        }
                    }
                }
            }

            // 7. Update league history with totals
            // CRITICAL: If season is ended AND we found NO wars (warsProcessed === 0),
            // it likely means data is too old and accessible via API anymore.
            // IN THIS CASE, DO NOT OVERWRITE EXISTING DATA WITH 0s.
            if (isEnded && warsProcessed === 0) {
                const msg = `Skipping stats update for ${clanTag} (Season: ${leagueGroup.season}, State: ended) because no war data could be fetched. Preserving existing data.`
                console.warn(msg)
                clanWarnings.push(msg)
            } else {
                await client
                    .from('league_history')
                    .update({
                        total_stars: totalClanStars,
                        total_destruction: totalClanDestruction,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', savedLeague.id)

                // 7.5 Update all league_clans with calculated stats and proper rankings
                // Sort clans by stars (desc) then destruction (desc) to determine rankings
                const sortedGroupClans = Array.from(groupClanStatsMap.entries())
                    .map(([clanTag, stats]) => ({
                        clan_tag: clanTag,
                        total_stars: stats.stars,
                        total_destruction: Math.round(stats.destruction * 100) / 100 // Round to 2 decimals
                    }))
                    .sort((a, b) => {
                        if (b.total_stars !== a.total_stars) return b.total_stars - a.total_stars
                        return b.total_destruction - a.total_destruction
                    })

                // Update each clan with stats and rank
                for (let i = 0; i < sortedGroupClans.length; i++) {
                    const clanStats = sortedGroupClans[i]
                    if (!clanStats) continue

                    const { error: updateError } = await client
                        .from('league_clans')
                        .update({
                            total_stars: clanStats.total_stars,
                            total_destruction: clanStats.total_destruction,
                            group_rank: i + 1
                        })
                        .eq('league_history_id', savedLeague.id)
                        .eq('clan_tag', clanStats.clan_tag)

                    if (updateError) {
                        const msg = `Failed to update stats for ${clanStats.clan_tag}: ${updateError.message}`
                        console.error(msg)
                        clanWarnings.push(msg)
                    }
                }

                // 7.6 Update final_rank in league_history with our clan's current position
                const ourClanRank = sortedGroupClans.findIndex(c => c.clan_tag === clanTag) + 1
                if (ourClanRank > 0) {
                    await client
                        .from('league_history')
                        .update({ final_rank: ourClanRank })
                        .eq('id', savedLeague.id)
                }
            }

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
                tag: clanTag,
                status: 'success',
                leagueId: savedLeague.id,
                season: savedLeague.season,
                participants: participantsData.length,
                warnings: clanWarnings
            })

            // Count successful updates
            if (savedLeague) updatedCount++

        } catch (e: any) {
            console.error(`Error processing clan ${clan.tag}:`, e)
            results.push({ tag: clan.tag, error: e.message || 'Unknown error' })
        }
    }

    // Generate detailed status message
    const failures = results.filter(r => r.error).map(r => `${r.tag}: ${r.error}`).join('; ')
    const skipped = results.filter(r => r.status && r.status.includes('skipped')).map(r => `${r.tag}`).join(', ')
    const warnings = results.filter(r => r.warnings && r.warnings.length > 0).map(r => `${r.tag}: ${r.warnings.join(', ')}`).join('; ')

    let statusMsg = `Processed ${clans.length} clans. Updated ${updatedCount} league seasons.`
    if (failures) statusMsg += ` Failures: ${failures}`
    if (skipped) statusMsg += ` Skipped: ${skipped}`
    if (warnings) statusMsg += ` Warnings: ${warnings}`

    // Log final result
    await client.from('cron_logs').insert({
        task_name: 'record-leagues',
        status: failures ? 'partial_success' : (warnings ? 'success_with_warnings' : 'success'),
        message: statusMsg.substring(0, 1000), // Truncate to avoid DB error
        items_count: updatedCount
    })

    return {
        success: true,
        results
    }
})
