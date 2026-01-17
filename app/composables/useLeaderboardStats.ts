/**
 * Composable for fetching and aggregating leaderboard statistics
 * from war_participants and league_participants tables.
 */
import { ref, computed, watch } from 'vue'

// Types
export interface LeaderboardEntry {
    rank: number
    playerTag: string
    playerName: string
    perfectCount: number    // 6-star for wars, 3-star per day for leagues
    oneStarCount: number    // 0-star + 1-star attacks combined
    zeroStarCount: number   // 0-star attacks only
    totalStars: number
    totalAttacks: number
    averageStars: number
    worstDestructionAvg: number  // Average destruction % for 0-1 star attacks (for sorting)
}

export interface LeaderboardFilters {
    range: 'last1' | 'last2' | 'last3' | 'last5' | 'last10' | 'all'
    clanTag: string | 'all'
}

export type LeaderboardType = 'war' | 'league'

// Range options for dropdowns
export const rangeOptions = [
    { label: 'Dernière', value: 'last1' },
    { label: '2 dernières', value: 'last2' },
    { label: '3 dernières', value: 'last3' },
    { label: '5 dernières', value: 'last5' },
    { label: '10 dernières', value: 'last10' },
    { label: 'Toutes les', value: 'all' }
]

export function useLeaderboardStats(type: LeaderboardType) {
    const supabase = useSupabaseClient()

    const loading = ref(false)
    const error = ref<string | null>(null)
    const rawData = ref<any[]>([])
    const clans = ref<{ tag: string; name: string }[]>([])

    const filters = ref<LeaderboardFilters>({
        range: 'last1',
        clanTag: 'all'
    })

    // Fetch tracked clans for dropdown
    const fetchClans = async () => {
        const { data } = await supabase
            .from('tracked_clans')
            .select('tag, name')
            .order('created_at', { ascending: true })

        if (data) clans.value = data
    }

    // Fetch leaderboard data based on type and filters
    const fetchData = async () => {
        loading.value = true
        error.value = null

        try {
            const limit = filters.value.range === 'all' ? 1000 : parseInt(filters.value.range.replace('last', ''))

            if (type === 'war') {
                await fetchWarStats(limit)
            } else {
                await fetchLeagueStats(limit)
            }
        } catch (e: any) {
            error.value = e.message
            console.error(`Error fetching ${type} leaderboard:`, e)
        } finally {
            loading.value = false
        }
    }

    const fetchWarStats = async (limit: number) => {
        // 1. Get the N most recent wars, optionally filtered by clan
        let warsQuery = (supabase.from('war_history') as any)
            .select('id, clan_tag, clan_name, end_date')
            .order('end_date', { ascending: false })
            .limit(limit * 10) // Get more in case of multiple clans

        if (filters.value.clanTag !== 'all') {
            warsQuery = warsQuery.eq('clan_tag', filters.value.clanTag)
        }

        const { data: wars }: { data: any[] | null } = await warsQuery

        if (!wars || wars.length === 0) {
            rawData.value = []
            return
        }

        // Group by clan to get N per clan
        const clanWarsMap = new Map<string, any[]>()
        for (const war of wars) {
            const arr = clanWarsMap.get(war.clan_tag) || []
            if (arr.length < limit) arr.push(war)
            clanWarsMap.set(war.clan_tag, arr)
        }

        const warIds = Array.from(clanWarsMap.values()).flat().map(w => w.id)

        // 2. Get participants for these wars
        const { data: participants }: { data: any[] | null } = await (supabase.from('war_participants') as any)
            .select('player_tag, player_name, stars, attacks_count, war_id')
            .in('war_id', warIds)

        if (!participants) {
            rawData.value = []
            return
        }

        // 3. Aggregate stats per player
        const playerMap = new Map<string, {
            playerTag: string
            playerName: string
            perfectCount: number
            zeroStarCount: number    // 0-star attacks
            oneStarCount: number     // 0-star + 1-star combined
            totalStars: number
            totalAttacks: number
            warsPlayed: number
            worstDestructionSum: number  // Sum of destruction % for 0-1 star attacks
            worstDestructionCount: number // Count for averaging
        }>()

        for (const p of participants) {
            const existing = playerMap.get(p.player_tag) || {
                playerTag: p.player_tag,
                playerName: p.player_name,
                perfectCount: 0,
                zeroStarCount: 0,
                oneStarCount: 0,
                totalStars: 0,
                totalAttacks: 0,
                warsPlayed: 0,
                worstDestructionSum: 0,
                worstDestructionCount: 0
            }

            existing.totalStars += p.stars || 0
            existing.totalAttacks += p.attacks_count || 0
            existing.warsPlayed += 1

            // Perfect (6 stars) = 2 attacks with 3 stars each
            if (p.stars === 6 && p.attacks_count === 2) {
                existing.perfectCount += 1
            }

            // Count wars where player got 0 stars (poor performance)
            if (p.stars === 0 && p.attacks_count >= 1) {
                existing.zeroStarCount += 1
                existing.oneStarCount += 1
                existing.worstDestructionSum += p.destruction || 0
                existing.worstDestructionCount += 1
            }
            // Count wars where player got 1-2 stars total (poor performance)
            else if (p.stars >= 1 && p.stars <= 2 && p.attacks_count >= 1) {
                existing.oneStarCount += 1
                existing.worstDestructionSum += p.destruction || 0
                existing.worstDestructionCount += 1
            }

            playerMap.set(p.player_tag, existing)
        }

        rawData.value = Array.from(playerMap.values())
    }

    const fetchLeagueStats = async (limit: number) => {
        // 1. Get the N most recent leagues, optionally filtered by clan
        let leaguesQuery = (supabase.from('league_history') as any)
            .select('id, clan_tag, clan_name, season')
            .order('season', { ascending: false })
            .limit(limit * 10)

        if (filters.value.clanTag !== 'all') {
            leaguesQuery = leaguesQuery.eq('clan_tag', filters.value.clanTag)
        }

        const { data: leagues }: { data: any[] | null } = await leaguesQuery

        if (!leagues || leagues.length === 0) {
            rawData.value = []
            return
        }

        // Group by clan to get N per clan
        const clanLeaguesMap = new Map<string, any[]>()
        for (const league of leagues) {
            const arr = clanLeaguesMap.get(league.clan_tag) || []
            if (arr.length < limit) arr.push(league)
            clanLeaguesMap.set(league.clan_tag, arr)
        }

        const leagueIds = Array.from(clanLeaguesMap.values()).flat().map(l => l.id)

        // 2. Get participants for these leagues
        const { data: participants }: { data: any[] | null } = await (supabase.from('league_participants') as any)
            .select('player_tag, player_name, total_stars, attacks_used, daily_attacks, league_history_id')
            .in('league_history_id', leagueIds)

        if (!participants) {
            rawData.value = []
            return
        }

        // 3. Aggregate stats per player
        const playerMap = new Map<string, {
            playerTag: string
            playerName: string
            perfectCount: number
            zeroStarCount: number    // 0-star attacks
            oneStarCount: number     // 0-star + 1-star combined
            totalStars: number
            totalAttacks: number
            leaguesPlayed: number
            worstDestructionSum: number  // Sum of destruction % for 0-1 star attacks
            worstDestructionCount: number // Count for averaging
        }>()

        for (const p of participants) {
            const existing = playerMap.get(p.player_tag) || {
                playerTag: p.player_tag,
                playerName: p.player_name,
                perfectCount: 0,
                zeroStarCount: 0,
                oneStarCount: 0,
                totalStars: 0,
                totalAttacks: 0,
                leaguesPlayed: 0,
                worstDestructionSum: 0,
                worstDestructionCount: 0
            }

            existing.totalStars += p.total_stars || 0
            existing.totalAttacks += p.attacks_used || 0
            existing.leaguesPlayed += 1

            // Parse daily_attacks to count stars and track destruction
            const dailyAttacks = p.daily_attacks || []
            for (const attack of dailyAttacks) {
                if (attack.stars === 3) existing.perfectCount += 1
                if (attack.stars === 0) {
                    existing.zeroStarCount += 1
                    existing.oneStarCount += 1
                    existing.worstDestructionSum += attack.destruction || 0
                    existing.worstDestructionCount += 1
                } else if (attack.stars === 1) {
                    existing.oneStarCount += 1
                    existing.worstDestructionSum += attack.destruction || 0
                    existing.worstDestructionCount += 1
                }
            }

            playerMap.set(p.player_tag, existing)
        }

        rawData.value = Array.from(playerMap.values())
    }

    // Computed leaderboards
    const perfectLeaderboard = computed<LeaderboardEntry[]>(() => {
        return rawData.value
            .filter(p => p.totalAttacks > 0)
            .sort((a, b) => b.perfectCount - a.perfectCount || b.totalStars - a.totalStars)
            .slice(0, 10)
            .map((p, idx) => ({
                rank: idx + 1,
                playerTag: p.playerTag,
                playerName: p.playerName,
                perfectCount: p.perfectCount,
                oneStarCount: p.oneStarCount,
                zeroStarCount: p.zeroStarCount || 0,
                totalStars: p.totalStars,
                totalAttacks: p.totalAttacks,
                averageStars: p.totalAttacks > 0 ? p.totalStars / p.totalAttacks : 0,
                worstDestructionAvg: p.worstDestructionCount > 0
                    ? p.worstDestructionSum / p.worstDestructionCount
                    : 0
            }))
    })

    const oneStarLeaderboard = computed<LeaderboardEntry[]>(() => {
        return rawData.value
            .filter(p => p.totalAttacks > 0 && p.oneStarCount > 0)
            .sort((a, b) => {
                // First: sort by 0-star count descending (worst first)
                if (b.zeroStarCount !== a.zeroStarCount) {
                    return b.zeroStarCount - a.zeroStarCount
                }
                // Then: sort by total 0-1 star count descending
                if (b.oneStarCount !== a.oneStarCount) {
                    return b.oneStarCount - a.oneStarCount
                }
                // Finally: sort by total attacks descending (more attacks = more visible)
                return b.totalAttacks - a.totalAttacks
            })
            .slice(0, 10)
            .map((p, idx) => ({
                rank: idx + 1,
                playerTag: p.playerTag,
                playerName: p.playerName,
                perfectCount: p.perfectCount,
                oneStarCount: p.oneStarCount,
                zeroStarCount: p.zeroStarCount || 0,
                totalStars: p.totalStars,
                totalAttacks: p.totalAttacks,
                averageStars: p.totalAttacks > 0 ? p.totalStars / p.totalAttacks : 0,
                worstDestructionAvg: p.worstDestructionCount > 0
                    ? p.worstDestructionSum / p.worstDestructionCount
                    : 0
            }))
    })

    // Watch filters and refetch
    watch(filters, fetchData, { deep: true })

    // Initial fetch
    const init = async () => {
        await Promise.all([
            fetchClans(),
            fetchData()
        ])
    }

    return {
        loading,
        error,
        filters,
        clans,
        perfectLeaderboard,
        oneStarLeaderboard,
        init,
        refetch: fetchData
    }
}
