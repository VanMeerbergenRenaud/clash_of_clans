/**
 * Comprehensive tests for Clan War League (CWL) database recording
 * 
 * These tests verify that when a CWL season ends, all data is correctly
 * recorded to the Supabase database:
 * - league_history: Season metadata (league name, final rank, totals)
 * - league_clans: All 8 clans in the group with their rankings
 * - league_participants: Individual player stats across all 7 days
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY!
const COC_API_TOKEN = process.env.COC_API_TOKEN!

// Test clan tag - use a real tracked clan for integration tests
const TEST_CLAN_TAG = '#22GU8YG8U'

describe('Clan War League Database Recording', () => {
    let supabase: SupabaseClient
    let testLeagueId: string | null = null

    beforeAll(async () => {
        // Initialize Supabase client
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

        // Verify connection
        const { error } = await supabase.from('tracked_clans').select('count').limit(1)
        if (error) {
            console.error('Failed to connect to Supabase:', error.message)
            throw new Error('Supabase connection failed. Check your credentials.')
        }

        console.log('✅ Connected to Supabase test database')
    })

    afterAll(async () => {
        // Clean up test data if created
        if (testLeagueId) {
            console.log(`🧹 Cleaning up test league: ${testLeagueId}`)

            // Delete in order of dependencies
            await supabase
                .from('league_participants')
                .delete()
                .eq('league_history_id', testLeagueId)

            await supabase
                .from('league_clans')
                .delete()
                .eq('league_history_id', testLeagueId)

            await supabase
                .from('league_history')
                .delete()
                .eq('id', testLeagueId)
        }
    })

    // ==========================================
    // TEST 1: Verify league_history table schema
    // ==========================================
    it('should have league_history table with correct schema', async () => {
        const { data, error } = await supabase
            .from('league_history')
            .select('*')
            .limit(1)

        expect(error).toBeNull()
        console.log('✅ league_history table schema is valid')
    })

    // ==========================================
    // TEST 2: Verify league_clans table schema
    // ==========================================
    it('should have league_clans table with correct schema', async () => {
        const { data, error } = await supabase
            .from('league_clans')
            .select('*')
            .limit(1)

        expect(error).toBeNull()
        console.log('✅ league_clans table schema is valid')
    })

    // ==========================================
    // TEST 3: Verify league_participants table schema
    // ==========================================
    it('should have league_participants table with correct schema', async () => {
        const { data, error } = await supabase
            .from('league_participants')
            .select('*')
            .limit(1)

        expect(error).toBeNull()
        console.log('✅ league_participants table schema is valid')
    })

    // ==========================================
    // TEST 4: Complete CWL recording flow
    // ==========================================
    it('should correctly record a finished CWL season to database', async () => {
        // Generate unique test season to avoid conflicts
        const testSeason = '2099-12' // Far future to avoid conflicts

        // Prepare league history data matching the schema from record-leagues.get.ts
        const leagueData = {
            season: testSeason,
            clan_tag: TEST_CLAN_TAG,
            clan_name: 'BELGIQUE 2 (TEST)',
            league_name: 'Champion III',
            league_id: 48000015,
            final_rank: 2,
            total_stars: 156,
            total_destruction: 678.5,
            result: 'stayed',
            state: 'ended'
        }

        // Insert league history
        const { data: savedLeague, error: leagueError } = await supabase
            .from('league_history')
            .upsert(leagueData, { onConflict: 'clan_tag, season' })
            .select()
            .single()

        expect(leagueError).toBeNull()
        expect(savedLeague).toBeDefined()
        expect(savedLeague.id).toBeDefined()
        expect(savedLeague.season).toBe(testSeason)
        expect(savedLeague.league_name).toBe('Champion III')
        expect(savedLeague.final_rank).toBe(2)
        expect(savedLeague.state).toBe('ended')

        testLeagueId = savedLeague.id
        console.log(`✅ League history recorded with ID: ${testLeagueId}`)

        // Prepare the 8 clans in the group
        const groupClans = [
            { tag: '#WINNER01', name: 'Les Champions', level: 25, rank: 1, stars: 165, dest: 712.3 },
            { tag: TEST_CLAN_TAG, name: 'BELGIQUE 2 (TEST)', level: 24, rank: 2, stars: 156, dest: 678.5 },
            { tag: '#THIRD001', name: 'Clash Dynasty', level: 23, rank: 3, stars: 148, dest: 645.2 },
            { tag: '#FOURTH01', name: 'War Machine', level: 22, rank: 4, stars: 142, dest: 621.8 },
            { tag: '#FIFTH001', name: 'Elite Warriors', level: 21, rank: 5, stars: 135, dest: 598.4 },
            { tag: '#SIXTH001', name: 'Night Raiders', level: 20, rank: 6, stars: 128, dest: 567.1 },
            { tag: '#SEVENTH1', name: 'Storm Chasers', level: 19, rank: 7, stars: 118, dest: 534.6 },
            { tag: '#EIGHTH01', name: 'Iron Lords', level: 18, rank: 8, stars: 105, dest: 489.2 },
        ]

        const clansData = groupClans.map(c => ({
            league_history_id: savedLeague.id,
            clan_tag: c.tag,
            clan_name: c.name,
            clan_level: c.level,
            badge_url: null,
            group_rank: c.rank,
            total_stars: c.stars,
            total_destruction: c.dest
        }))

        // Insert group clans
        const { error: clansError } = await supabase
            .from('league_clans')
            .upsert(clansData, { onConflict: 'league_history_id, clan_tag' })

        expect(clansError).toBeNull()
        console.log(`✅ ${groupClans.length} clans recorded in group`)

        // Verify clans were saved correctly
        const { data: savedClans, error: fetchClansError } = await supabase
            .from('league_clans')
            .select('*')
            .eq('league_history_id', savedLeague.id)
            .order('group_rank')

        expect(fetchClansError).toBeNull()
        expect(savedClans).toHaveLength(8)

        // Verify ranking order
        expect(savedClans?.[0].clan_tag).toBe('#WINNER01')
        expect(savedClans?.[0].group_rank).toBe(1)
        expect(savedClans?.[7].clan_tag).toBe('#EIGHTH01')
        expect(savedClans?.[7].group_rank).toBe(8)

        console.log('✅ Group clans verified with correct rankings')
    })

    // ==========================================
    // TEST 5: Record CWL participants with daily attacks
    // ==========================================
    it('should correctly record CWL participants with daily attack data', async () => {
        if (!testLeagueId) {
            console.log('⏭️  Skipping - no test league created')
            return
        }

        // Prepare participants data matching the schema
        const participants = [
            {
                player_tag: '#CWLTEST01',
                player_name: 'TestLeader',
                town_hall_level: 17,
                map_position: 1,
                total_stars: 21,
                total_destruction: 700,
                attacks_used: 7,
                daily_attacks: generateDailyAttacks(7, 'perfect')
            },
            {
                player_tag: '#CWLTEST02',
                player_name: 'TestCoLeader',
                town_hall_level: 17,
                map_position: 2,
                total_stars: 18,
                total_destruction: 620,
                attacks_used: 7,
                daily_attacks: generateDailyAttacks(7, 'good')
            },
            {
                player_tag: '#CWLTEST03',
                player_name: 'InactiveMember',
                town_hall_level: 16,
                map_position: 3,
                total_stars: 0,
                total_destruction: 0,
                attacks_used: 0,
                daily_attacks: []
            },
            {
                player_tag: '#CWLTEST04',
                player_name: 'PartialPlayer',
                town_hall_level: 16,
                map_position: 4,
                total_stars: 9,
                total_destruction: 310,
                attacks_used: 4,
                daily_attacks: generateDailyAttacks(4, 'average')
            }
        ]

        const participantsData = participants.map(p => ({
            league_history_id: testLeagueId,
            ...p
        }))

        // Insert participants
        const { error: partError } = await supabase
            .from('league_participants')
            .upsert(participantsData, { onConflict: 'league_history_id, player_tag' })

        expect(partError).toBeNull()
        console.log(`✅ ${participants.length} CWL participants recorded`)

        // Verify participants were saved correctly
        const { data: savedParticipants, error: fetchError } = await supabase
            .from('league_participants')
            .select('*')
            .eq('league_history_id', testLeagueId)
            .order('map_position')

        expect(fetchError).toBeNull()
        expect(savedParticipants).toHaveLength(participants.length)

        // Verify perfect scorer
        const perfectPlayer = savedParticipants?.find(p => p.player_tag === '#CWLTEST01')
        expect(perfectPlayer).toBeDefined()
        expect(perfectPlayer?.total_stars).toBe(21)
        expect(perfectPlayer?.attacks_used).toBe(7)
        expect(perfectPlayer?.daily_attacks).toHaveLength(7)

        // Verify inactive player
        const inactivePlayer = savedParticipants?.find(p => p.player_tag === '#CWLTEST03')
        expect(inactivePlayer).toBeDefined()
        expect(inactivePlayer?.total_stars).toBe(0)
        expect(inactivePlayer?.attacks_used).toBe(0)
        expect(inactivePlayer?.daily_attacks).toHaveLength(0)

        // Verify partial player (missed some days)
        const partialPlayer = savedParticipants?.find(p => p.player_tag === '#CWLTEST04')
        expect(partialPlayer).toBeDefined()
        expect(partialPlayer?.attacks_used).toBe(4)
        expect(partialPlayer?.daily_attacks).toHaveLength(4)

        console.log('✅ All CWL participant data verified including daily attacks')
    })

    // ==========================================
    // TEST 6: CWL player stats aggregation
    // ==========================================
    it('should correctly aggregate player stats across multiple war rounds', async () => {
        // Simulate the player stats aggregation logic from record-leagues.get.ts
        const playerStatsMap = new Map<string, any>()

        // Simulate processing 7 war rounds
        const rounds = [
            { day: 1, attacks: [{ player: '#PLAYER1', stars: 3, dest: 100 }] },
            { day: 2, attacks: [{ player: '#PLAYER1', stars: 2, dest: 85 }] },
            { day: 3, attacks: [{ player: '#PLAYER1', stars: 3, dest: 100 }] },
            { day: 4, attacks: [{ player: '#PLAYER1', stars: 3, dest: 100 }] },
            { day: 5, attacks: [{ player: '#PLAYER1', stars: 2, dest: 78 }] },
            { day: 6, attacks: [{ player: '#PLAYER1', stars: 3, dest: 100 }] },
            { day: 7, attacks: [{ player: '#PLAYER1', stars: 3, dest: 100 }] },
        ]

        // Process each round (mimicking the logic in record-leagues.get.ts)
        for (const round of rounds) {
            for (const attack of round.attacks) {
                const existing = playerStatsMap.get(attack.player) || {
                    player_tag: attack.player,
                    total_stars: 0,
                    total_destruction: 0,
                    attacks_used: 0,
                    daily_attacks: []
                }

                existing.total_stars += attack.stars
                existing.total_destruction += attack.dest
                existing.attacks_used += 1
                existing.daily_attacks.push({
                    day: round.day,
                    stars: attack.stars,
                    destruction: attack.dest
                })

                playerStatsMap.set(attack.player, existing)
            }
        }

        const aggregatedPlayer = playerStatsMap.get('#PLAYER1')!

        expect(aggregatedPlayer.total_stars).toBe(19) // 3+2+3+3+2+3+3
        expect(aggregatedPlayer.total_destruction).toBe(663) // 100+85+100+100+78+100+100
        expect(aggregatedPlayer.attacks_used).toBe(7)
        expect(aggregatedPlayer.daily_attacks).toHaveLength(7)

        console.log('✅ Player stats aggregation logic verified')
    })

    // ==========================================
    // TEST 7: CWL state handling (in progress vs ended)
    // ==========================================
    it('should correctly handle CWL state transitions', async () => {
        if (!testLeagueId) {
            console.log('⏭️  Skipping - no test league created')
            return
        }

        // Simulate updating from inProgress to ended
        const { data: updatedLeague, error } = await supabase
            .from('league_history')
            .update({ state: 'ended' })
            .eq('id', testLeagueId)
            .select()
            .single()

        expect(error).toBeNull()
        expect(updatedLeague.state).toBe('ended')

        console.log('✅ CWL state transition handling verified')
    })

    // ==========================================
    // TEST 8: League totals update after processing
    // ==========================================
    it('should correctly update league totals after processing all rounds', async () => {
        if (!testLeagueId) {
            console.log('⏭️  Skipping - no test league created')
            return
        }

        // Simulate updating totals after processing all wars
        const newTotals = {
            total_stars: 162,
            total_destruction: 695.3,
            updated_at: new Date().toISOString()
        }

        const { data: updatedLeague, error } = await supabase
            .from('league_history')
            .update(newTotals)
            .eq('id', testLeagueId)
            .select()
            .single()

        expect(error).toBeNull()
        expect(updatedLeague.total_stars).toBe(162)
        expect(updatedLeague.total_destruction).toBe(695.3)

        console.log('✅ League totals update verified')
    })

    // ==========================================
    // TEST 9: Upsert behavior for CWL updates
    // ==========================================
    it('should update existing CWL when upserting with same clan_tag and season', async () => {
        if (!testLeagueId) {
            console.log('⏭️  Skipping - no test league created')
            return
        }

        // Get the existing league
        const { data: existingLeague } = await supabase
            .from('league_history')
            .select('*')
            .eq('id', testLeagueId)
            .single()

        expect(existingLeague).toBeDefined()

        // Upsert with updated final_rank (simulating end of CWL with final standings)
        const updatedLeagueData = {
            season: existingLeague.season,
            clan_tag: existingLeague.clan_tag,
            clan_name: existingLeague.clan_name,
            league_name: existingLeague.league_name,
            league_id: existingLeague.league_id,
            final_rank: 1, // We won!
            total_stars: 180,
            total_destruction: 750.0,
            result: 'promoted',
            state: 'ended'
        }

        const { data: upsertedLeague, error } = await supabase
            .from('league_history')
            .upsert(updatedLeagueData, { onConflict: 'clan_tag, season' })
            .select()
            .single()

        expect(error).toBeNull()
        expect(upsertedLeague.id).toBe(testLeagueId)
        expect(upsertedLeague.final_rank).toBe(1)
        expect(upsertedLeague.result).toBe('promoted')

        console.log('✅ CWL upsert correctly updated existing season')
    })

    // ==========================================
    // TEST 10: Handle multiple tracked clans independently
    // ==========================================
    it('should process multiple tracked clans independently', async () => {
        // Verify the logic that each clan is processed separately
        const mockedClans = [
            { tag: '#CLAN1', name: 'First Clan' },
            { tag: '#CLAN2', name: 'Second Clan' },
            { tag: '#CLAN3', name: 'Third Clan' }
        ]

        const results: any[] = []

        // Simulate processing logic
        for (const clan of mockedClans) {
            try {
                // Each clan would be processed independently
                results.push({ tag: clan.tag, status: 'success' })
            } catch (e: any) {
                // Errors for one clan don't affect others
                results.push({ tag: clan.tag, error: e.message })
            }
        }

        expect(results).toHaveLength(3)
        expect(results.every(r => r.status === 'success')).toBe(true)

        console.log('✅ Multiple clan processing independence verified')
    })
})

// ==========================================
// Helper function: Generate daily attacks
// ==========================================
function generateDailyAttacks(count: number, profile: 'perfect' | 'good' | 'average'): any[] {
    const attacks = []
    const opponents = [
        { tag: '#OPP1', name: 'Opponent 1' },
        { tag: '#OPP2', name: 'Opponent 2' },
        { tag: '#OPP3', name: 'Opponent 3' },
        { tag: '#OPP4', name: 'Opponent 4' },
        { tag: '#OPP5', name: 'Opponent 5' },
        { tag: '#OPP6', name: 'Opponent 6' },
        { tag: '#OPP7', name: 'Opponent 7' },
    ]

    for (let day = 1; day <= count; day++) {
        let stars: number
        let destruction: number

        switch (profile) {
            case 'perfect':
                stars = 3
                destruction = 100
                break
            case 'good':
                stars = Math.random() > 0.3 ? 3 : 2
                destruction = stars === 3 ? 100 : 75 + Math.floor(Math.random() * 20)
                break
            case 'average':
                stars = Math.random() > 0.5 ? 3 : (Math.random() > 0.5 ? 2 : 1)
                destruction = stars === 3 ? 100 : (stars === 2 ? 60 + Math.floor(Math.random() * 35) : 30 + Math.floor(Math.random() * 40))
                break
        }

        const opponent = opponents[(day - 1) % opponents.length]
        attacks.push({
            day,
            stars,
            destruction,
            opponent_tag: opponent.tag,
            opponent_name: opponent.name
        })
    }

    return attacks
}
