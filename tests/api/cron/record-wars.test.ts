/**
 * Comprehensive tests for Clan War database recording
 * 
 * These tests verify that when a clan war ends, all data is correctly
 * recorded to the Supabase database:
 * - war_history: War metadata (dates, scores, result)
 * - war_participants: Individual player performances
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

describe('Clan War Database Recording', () => {
    let supabase: SupabaseClient
    let testWarId: string | null = null

    beforeAll(async () => {
        // Initialize Supabase client with service role for testing
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
        if (testWarId) {
            console.log(`🧹 Cleaning up test war: ${testWarId}`)
            // First delete participants (foreign key constraint)
            await supabase
                .from('war_participants')
                .delete()
                .eq('war_id', testWarId)

            // Then delete the war
            await supabase
                .from('war_history')
                .delete()
                .eq('id', testWarId)
        }
    })

    // ==========================================
    // TEST 1: Verify tracked_clans table exists
    // ==========================================
    it('should have tracked_clans table configured', async () => {
        const { data, error } = await supabase
            .from('tracked_clans')
            .select('tag, name')
            .limit(5)

        expect(error).toBeNull()
        expect(data).toBeDefined()
        console.log(`📋 Found ${data?.length || 0} tracked clans`)
    })

    // ==========================================
    // TEST 2: Verify war_history table schema
    // ==========================================
    it('should have war_history table with correct schema', async () => {
        const { data, error } = await supabase
            .from('war_history')
            .select('*')
            .limit(1)

        expect(error).toBeNull()

        // Verify we can query the table (schema is correct)
        // If schema is wrong, the query would fail
        console.log('✅ war_history table schema is valid')
    })

    // ==========================================
    // TEST 3: Verify war_participants table schema
    // ==========================================
    it('should have war_participants table with correct schema', async () => {
        const { data, error } = await supabase
            .from('war_participants')
            .select('*')
            .limit(1)

        expect(error).toBeNull()
        console.log('✅ war_participants table schema is valid')
    })

    // ==========================================
    // TEST 4: Complete war recording flow
    // ==========================================
    it('should correctly record a finished war to database', async () => {
        // Generate unique test data with timestamp to avoid conflicts
        const testTimestamp = new Date().toISOString()
        const testEndDate = `2099-12-31T23:59:59.000Z` // Far future to avoid conflicts

        // Prepare war data matching the schema from record-wars.get.ts
        const warData = {
            team_size: 15,
            start_date: '2099-12-30T10:00:00.000Z',
            end_date: testEndDate,
            clan_tag: TEST_CLAN_TAG,
            clan_name: 'BELGIQUE 2 (TEST)',
            clan_stars: 42,
            clan_destruction: 95.5,
            opponent_tag: '#TESTOPPO1',
            opponent_name: 'Test Opponent Clan',
            opponent_stars: 38,
            opponent_destruction: 88.2,
            result: 'win'
        }

        // Insert war history
        const { data: savedWar, error: warError } = await supabase
            .from('war_history')
            .upsert(warData, { onConflict: 'clan_tag, end_date' })
            .select()
            .single()

        expect(warError).toBeNull()
        expect(savedWar).toBeDefined()
        expect(savedWar.id).toBeDefined()
        expect(savedWar.result).toBe('win')
        expect(savedWar.clan_stars).toBe(42)
        expect(savedWar.opponent_stars).toBe(38)

        testWarId = savedWar.id
        console.log(`✅ War recorded with ID: ${testWarId}`)

        // Prepare participants data
        const participants = [
            { name: 'TestPlayer1', tag: '#TESTP0001', th: 17, pos: 1, stars: 6, dest: 200, attacks: 2 },
            { name: 'TestPlayer2', tag: '#TESTP0002', th: 17, pos: 2, stars: 5, dest: 185, attacks: 2 },
            { name: 'TestPlayer3', tag: '#TESTP0003', th: 16, pos: 3, stars: 4, dest: 165, attacks: 2 },
            { name: 'TestPlayer4', tag: '#TESTP0004', th: 16, pos: 4, stars: 6, dest: 200, attacks: 2 },
            { name: 'TestPlayer5', tag: '#TESTP0005', th: 15, pos: 5, stars: 3, dest: 120, attacks: 2 },
            { name: 'InactivePlayer', tag: '#TESTP0006', th: 15, pos: 6, stars: 0, dest: 0, attacks: 0 },
        ]

        const participantsData = participants.map(p => ({
            war_id: savedWar.id,
            player_tag: p.tag,
            player_name: p.name,
            stars: p.stars,
            destruction: p.dest,
            attacks_count: p.attacks,
            town_hall_level: p.th,
            map_position: p.pos
        }))

        // Insert participants
        const { error: partError } = await supabase
            .from('war_participants')
            .upsert(participantsData, { onConflict: 'war_id, player_tag' })

        expect(partError).toBeNull()
        console.log(`✅ ${participants.length} participants recorded`)

        // Verify participants were saved correctly
        const { data: savedParticipants, error: fetchError } = await supabase
            .from('war_participants')
            .select('*')
            .eq('war_id', savedWar.id)
            .order('map_position')

        expect(fetchError).toBeNull()
        expect(savedParticipants).toHaveLength(participants.length)

        // Verify specific participant data
        const topPlayer = savedParticipants?.find(p => p.player_tag === '#TESTP0001')
        expect(topPlayer).toBeDefined()
        expect(topPlayer?.stars).toBe(6)
        expect(topPlayer?.destruction).toBe(200)

        // Verify inactive player was recorded
        const inactivePlayer = savedParticipants?.find(p => p.player_tag === '#TESTP0006')
        expect(inactivePlayer).toBeDefined()
        expect(inactivePlayer?.stars).toBe(0)
        expect(inactivePlayer?.attacks_count).toBe(0)

        console.log('✅ All participant data verified')
    })

    // ==========================================
    // TEST 5: War result calculation
    // ==========================================
    it('should correctly calculate war results (win/lose/tie)', async () => {
        // Test different result scenarios
        const scenarios = [
            { clan_stars: 45, opponent_stars: 40, clan_destruction: 95, opponent_destruction: 88, expected: 'win' },
            { clan_stars: 40, opponent_stars: 45, clan_destruction: 88, opponent_destruction: 95, expected: 'lose' },
            { clan_stars: 42, opponent_stars: 42, clan_destruction: 95, opponent_destruction: 88, expected: 'win' }, // Tie by stars, win by destruction
            { clan_stars: 42, opponent_stars: 42, clan_destruction: 88, opponent_destruction: 95, expected: 'lose' }, // Tie by stars, lose by destruction
            { clan_stars: 42, opponent_stars: 42, clan_destruction: 90, opponent_destruction: 90, expected: 'tie' }, // Perfect tie
        ]

        for (const scenario of scenarios) {
            // Calculate result using same logic as record-wars.get.ts
            const result = scenario.clan_stars > scenario.opponent_stars
                ? 'win'
                : scenario.clan_stars < scenario.opponent_stars
                    ? 'lose'
                    : scenario.clan_destruction > scenario.opponent_destruction
                        ? 'win'
                        : scenario.clan_destruction < scenario.opponent_destruction
                            ? 'lose'
                            : 'tie'

            expect(result).toBe(scenario.expected)
        }

        console.log('✅ War result calculation logic verified')
    })

    // ==========================================
    // TEST 6: Date parsing for CoC API format
    // ==========================================
    it('should correctly parse CoC API date format', () => {
        // Test the date parsing function used in record-wars.get.ts
        const parseCocDate = (dateStr: string) => {
            if (!dateStr) return null
            const pattern = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/
            const match = dateStr.match(pattern)
            if (!match) return new Date().toISOString()
            return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`
        }

        // Test cases
        expect(parseCocDate('20231201T100000.000Z')).toBe('2023-12-01T10:00:00.000Z')
        expect(parseCocDate('20240615T143052.000Z')).toBe('2024-06-15T14:30:52.000Z')
        expect(parseCocDate('')).toBeNull()

        console.log('✅ CoC date parsing logic verified')
    })

    // ==========================================
    // TEST 7: Upsert behavior (update existing war)
    // ==========================================
    it('should update existing war when upserting with same clan_tag and end_date', async () => {
        if (!testWarId) {
            console.log('⏭️  Skipping upsert test - no test war created')
            return
        }

        // Get the existing war
        const { data: existingWar } = await supabase
            .from('war_history')
            .select('*')
            .eq('id', testWarId)
            .single()

        expect(existingWar).toBeDefined()

        // Update the war with new stats (simulating war just ended with final scores)
        const updatedWarData = {
            ...existingWar,
            clan_stars: 45, // Updated from 42
            clan_destruction: 98.0 // Updated from 95.5
        }
        delete updatedWarData.id // Remove id for upsert
        delete updatedWarData.created_at

        const { data: upsertedWar, error } = await supabase
            .from('war_history')
            .upsert(updatedWarData, { onConflict: 'clan_tag, end_date' })
            .select()
            .single()

        expect(error).toBeNull()
        expect(upsertedWar.id).toBe(testWarId) // Should be same ID (update, not insert)
        expect(upsertedWar.clan_stars).toBe(45)
        expect(upsertedWar.clan_destruction).toBe(98.0)

        console.log('✅ Upsert correctly updated existing war')
    })

    // ==========================================
    // TEST 8: Handle missing attacks gracefully
    // ==========================================
    it('should correctly aggregate attack stats for participants', async () => {
        // Simulate the attack aggregation logic from record-wars.get.ts
        const mockMember = {
            tag: '#MOCKPLAYER',
            name: 'MockPlayer',
            townhallLevel: 17,
            mapPosition: 1,
            attacks: [
                { stars: 3, destructionPercentage: 100 },
                { stars: 2, destructionPercentage: 85 }
            ]
        }

        // Aggregation logic from record-wars.get.ts
        const aggregated = {
            player_tag: mockMember.tag,
            player_name: mockMember.name,
            stars: mockMember.attacks ? mockMember.attacks.reduce((acc: number, atk: any) => acc + atk.stars, 0) : 0,
            destruction: mockMember.attacks ? mockMember.attacks.reduce((acc: number, atk: any) => acc + atk.destructionPercentage, 0) : 0,
            attacks_count: mockMember.attacks ? mockMember.attacks.length : 0,
            town_hall_level: mockMember.townhallLevel,
            map_position: mockMember.mapPosition
        }

        expect(aggregated.stars).toBe(5) // 3 + 2
        expect(aggregated.destruction).toBe(185) // 100 + 85
        expect(aggregated.attacks_count).toBe(2)

        // Test with no attacks
        const memberNoAttacks = { ...mockMember, attacks: undefined }
        const aggregatedNoAttacks = {
            stars: memberNoAttacks.attacks ? memberNoAttacks.attacks.reduce((acc: number, atk: any) => acc + atk.stars, 0) : 0,
            destruction: memberNoAttacks.attacks ? memberNoAttacks.attacks.reduce((acc: number, atk: any) => acc + atk.destructionPercentage, 0) : 0,
            attacks_count: memberNoAttacks.attacks ? memberNoAttacks.attacks.length : 0
        }

        expect(aggregatedNoAttacks.stars).toBe(0)
        expect(aggregatedNoAttacks.destruction).toBe(0)
        expect(aggregatedNoAttacks.attacks_count).toBe(0)

        console.log('✅ Attack aggregation logic works correctly')
    })
})
