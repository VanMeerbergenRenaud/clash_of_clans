import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client = serverSupabaseServiceRole(event)

    // Target clan tag (must be in tracked_clans)
    const targetTag = '#22GU8YG8U'

    // 1. Verify the clan is tracked
    let { data: myClan, error: clanError } = await client
        .from('tracked_clans')
        .select('tag, name')
        .eq('tag', targetTag)
        .single()

    if (!myClan) {
        console.log(`Clan ${targetTag} not found in tracked_clans. Auto-creating...`)
        const { data: newClan, error: createError } = await client
            .from('tracked_clans')
            .insert({ tag: targetTag, name: 'BELGIQUE 2', ordered: 99 })
            .select()
            .single()

        if (createError) {
            return { success: false, error: `Cannot create tracked clan ${targetTag}: ${createError.message}` }
        }
        myClan = newClan
    }

    // 2. Prepare league season data
    const season = '2024-01'
    const leagueData = {
        season,
        clan_tag: myClan.tag,
        clan_name: myClan.name,
        league_name: 'Champion III',
        league_id: 48000015,
        final_rank: 2,
        total_stars: 156,
        total_destruction: 678.5,
        result: 'stayed',
        state: 'ended'
    }

    try {
        // 3. Insert/Update league history
        const { data: savedLeague, error: leagueError } = await client
            .from('league_history')
            .upsert(leagueData, { onConflict: 'clan_tag, season' })
            .select()
            .single()

        if (leagueError) throw new Error(`Error inserting league_history: ${leagueError.message}`)

        // 4. Insert the 8 clans in the group (including our clan)
        const groupClans = [
            { tag: myClan.tag, name: myClan.name, level: 24, rank: 2, stars: 156, dest: 678.5, badge: 'https://api-assets.clashofclans.com/badges/200/ISyB5wAm2v7B_rm-LJS360ga-83IFL8MABcjxft1RkA.png' },
            { tag: '#WINNER01', name: 'Les Champions', level: 25, rank: 1, stars: 165, dest: 712.3, badge: 'https://api-assets.clashofclans.com/badges/200/5TuBZjMO479ySwCTYdYFBKGxrGH1gJESY6gWLl0MYDs.png' },
            { tag: '#THIRD001', name: 'Clash Dynasty', level: 23, rank: 3, stars: 148, dest: 645.2, badge: 'https://api-assets.clashofclans.com/badges/200/tWA-u6CK_97Q4sFhL8NAu7MlzhICO5xPqwCYoB6vm2Y.png' },
            { tag: '#FOURTH01', name: 'War Machine', level: 22, rank: 4, stars: 142, dest: 621.8, badge: 'https://api-assets.clashofclans.com/badges/200/PZkPot-lujNnctM-lfgj8tGYpwVZnHnxRktwWBXc_XM.png' },
            { tag: '#FIFTH001', name: 'Elite Warriors', level: 21, rank: 5, stars: 135, dest: 598.4, badge: 'https://api-assets.clashofclans.com/badges/200/3BWqO9RC8jmB0V3kgQaqv5_l3fNM-X6aFVC5eqLfiSk.png' },
            { tag: '#SIXTH001', name: 'Night Raiders', level: 20, rank: 6, stars: 128, dest: 567.1, badge: 'https://api-assets.clashofclans.com/badges/200/5TuBZjMO479ySwCTYdYFBKGxrGH1gJESY6gWLl0MYDs.png' },
            { tag: '#SEVENTH1', name: 'Storm Chasers', level: 19, rank: 7, stars: 118, dest: 534.6, badge: 'https://api-assets.clashofclans.com/badges/200/tWA-u6CK_97Q4sFhL8NAu7MlzhICO5xPqwCYoB6vm2Y.png' },
            { tag: '#EIGHTH01', name: 'Iron Lords', level: 18, rank: 8, stars: 105, dest: 489.2, badge: 'https://api-assets.clashofclans.com/badges/200/PZkPot-lujNnctM-lfgj8tGYpwVZnHnxRktwWBXc_XM.png' },
        ]

        const clansData = groupClans.map(c => ({
            league_history_id: savedLeague.id,
            clan_tag: c.tag,
            clan_name: c.name,
            clan_level: c.level,
            badge_url: c.badge,
            group_rank: c.rank,
            total_stars: c.stars,
            total_destruction: c.dest
        }))

        const { error: clansError } = await client
            .from('league_clans')
            .upsert(clansData, { onConflict: 'league_history_id, clan_tag' })

        if (clansError) throw new Error(`Error inserting league_clans: ${clansError.message}`)

        // 5. Insert participants (15 real + random for testing)
        // Simulating 7 days of CWL with various performances
        const realParticipants = [
            { name: 'attila', tag: '#2JGPQVGCU', th: 17, pos: 1, stars: 21, dest: 700, attacks: 7, daily: generateDailyAttacks(7, 'perfect') },
            { name: 'Dan', tag: '#LVQQ0CJL9', th: 17, pos: 2, stars: 20, dest: 678, attacks: 7, daily: generateDailyAttacks(7, 'good') },
            { name: 'SuperNovazz', tag: '#8VGVPR9L', th: 17, pos: 3, stars: 21, dest: 700, attacks: 7, daily: generateDailyAttacks(7, 'perfect') },
            { name: 'Damien', tag: '#JQQJLLCQ', th: 17, pos: 4, stars: 18, dest: 612, attacks: 7, daily: generateDailyAttacks(7, 'average') },
            { name: 'Mac Mini', tag: '#PJL2LRJ8Q', th: 17, pos: 5, stars: 19, dest: 645, attacks: 7, daily: generateDailyAttacks(7, 'good') },
            { name: '-Akdak-', tag: '#YJQV280Q', th: 17, pos: 6, stars: 17, dest: 589, attacks: 7, daily: generateDailyAttacks(7, 'average') },
            { name: 'Jacquard', tag: '#Q29YCY2RY', th: 17, pos: 7, stars: 21, dest: 700, attacks: 7, daily: generateDailyAttacks(7, 'perfect') },
            { name: 'Clasheur', tag: '#QPJPUY8P2', th: 17, pos: 8, stars: 16, dest: 534, attacks: 7, daily: generateDailyAttacks(7, 'average') },
            { name: '⚡️M R T Z⚡️', tag: '#GLUUQ0QL', th: 17, pos: 9, stars: 12, dest: 423, attacks: 5, daily: generateDailyAttacks(5, 'struggling') }, // Missing 2 attacks
            { name: 'Martinezz', tag: '#8QJGURJY8', th: 17, pos: 10, stars: 0, dest: 0, attacks: 0, daily: [] }, // Never played
            { name: 'Nathan19', tag: '#20GQ8PV0', th: 17, pos: 11, stars: 15, dest: 512, attacks: 6, daily: generateDailyAttacks(6, 'average') }, // Missing 1 attack
            { name: 'Zejonat', tag: '#98CL20QJ', th: 17, pos: 12, stars: 18, dest: 623, attacks: 7, daily: generateDailyAttacks(7, 'good') },
            { name: 'dimitri', tag: '#LR2YGPUYU', th: 17, pos: 13, stars: 17, dest: 578, attacks: 7, daily: generateDailyAttacks(7, 'average') },
            { name: 'Xben™', tag: '#8CUVPJGY', th: 17, pos: 14, stars: 21, dest: 700, attacks: 7, daily: generateDailyAttacks(7, 'perfect') },
            { name: 'Newt_', tag: '#G2JV8CJ9', th: 17, pos: 15, stars: 20, dest: 689, attacks: 7, daily: generateDailyAttacks(7, 'good') },
        ]

        // Add more participants to fill a 15v15 roster
        const fillerParticipants = []
        for (let i = 16; i <= 15; i++) {
            const attacks = Math.floor(Math.random() * 3) + 5 // 5-7 attacks
            fillerParticipants.push({
                name: `Réserviste ${i}`,
                tag: `#CWLSIM${i}XX`,
                th: 15 + Math.floor(Math.random() * 3),
                pos: i,
                stars: attacks * 2 + Math.floor(Math.random() * attacks),
                dest: attacks * 85 + Math.floor(Math.random() * 100),
                attacks,
                daily: generateDailyAttacks(attacks, 'average')
            })
        }

        const allParticipants = [...realParticipants, ...fillerParticipants]

        const participantsData = allParticipants.map(p => ({
            league_history_id: savedLeague.id,
            player_tag: p.tag,
            player_name: p.name,
            town_hall_level: p.th,
            map_position: p.pos,
            total_stars: p.stars,
            total_destruction: p.dest,
            attacks_used: p.attacks,
            daily_attacks: p.daily
        }))

        const { error: partError } = await client
            .from('league_participants')
            .upsert(participantsData, { onConflict: 'league_history_id, player_tag' })

        if (partError) throw new Error(`Error inserting league_participants: ${partError.message}`)

        return {
            success: true,
            message: `✅ CWL Season ${season} simulated for clan ${myClan.name} (${myClan.tag}).`,
            league: savedLeague,
            clans_count: clansData.length,
            participants_count: participantsData.length
        }

    } catch (err: any) {
        return {
            success: false,
            error: err.message
        }
    }
})

// Helper function to generate realistic daily attack data
function generateDailyAttacks(count: number, profile: 'perfect' | 'good' | 'average' | 'struggling') {
    const attacks = []
    const opponents = [
        { tag: '#WINNER01', name: 'Les Champions' },
        { tag: '#THIRD001', name: 'Clash Dynasty' },
        { tag: '#FOURTH01', name: 'War Machine' },
        { tag: '#FIFTH001', name: 'Elite Warriors' },
        { tag: '#SIXTH001', name: 'Night Raiders' },
        { tag: '#SEVENTH1', name: 'Storm Chasers' },
        { tag: '#EIGHTH01', name: 'Iron Lords' },
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
                destruction = stars === 3 ? 100 : 70 + Math.floor(Math.random() * 25)
                break
            case 'average':
                stars = Math.random() > 0.5 ? 3 : (Math.random() > 0.5 ? 2 : 1)
                destruction = stars === 3 ? 100 : (stars === 2 ? 55 + Math.floor(Math.random() * 40) : 30 + Math.floor(Math.random() * 40))
                break
            case 'struggling':
                stars = Math.random() > 0.7 ? 2 : (Math.random() > 0.5 ? 1 : 0)
                destruction = stars === 2 ? 65 + Math.floor(Math.random() * 30) : (stars === 1 ? 25 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 30))
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
