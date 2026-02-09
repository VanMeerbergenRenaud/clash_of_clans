import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const client: any = serverSupabaseServiceRole(event)

    // Tag cible demandé par l'utilisateur
    const targetTag = '#22GU8YG8U'

    // 1. D'abord on vérifie si ce clan est bien suivi
    let { data: myClan, error: clanError } = await client
        .from('tracked_clans')
        .select('tag, name')
        .eq('tag', targetTag)
        .single()

    // Si le clan n'est pas trouvé dans les suivis, on l'ajoute pour que le lien fonctionne
    if (!myClan) {
        console.log(`Clan ${targetTag} non trouvé dans tracked_clans. Création auto...`)
        const { data: newClan, error: createError } = await client
            .from('tracked_clans')
            .insert({ tag: targetTag, name: 'BELGIQUE 2', ordered: 99 })
            .select()
            .single()

        if (createError) {
            return { success: false, error: `Impossible de créer le clan suivi ${targetTag}: ${createError.message}` }
        }
        myClan = newClan
    }

    // 2. Préparation des données de guerre
    const warData = {
        team_size: 30,
        start_date: '2025-08-30T18:18:00.000Z',
        end_date: '2025-08-31T18:18:00.000Z',
        // ICI : on utilise bien le tag du clan suivi pour la liaison
        clan_tag: myClan.tag,
        // On peut laisser le nom pour info, ou le laisser null si on veut "que l'opposant ait un nom"
        // (Mais pour l'affichage historique c'est souvent pratique d'avoir le snapshot du nom à ce moment là)
        clan_name: myClan.name,
        clan_stars: 82,
        clan_destruction: 96.07,

        // OPPOSANT : Lui a besoin de son Tag + Nom car il n'est pas dans nos suivis
        opponent_tag: '#PL8YL2RY',
        opponent_name: 'Die Ysters',
        opponent_stars: 76,
        opponent_destruction: 94.0,
        clan_badge_url: 'https://api-assets.clashofclans.com/badges/200/ISyB5wAm2v7B_rm-LJS360ga-83IFL8MABcjxft1RkA.png',
        opponent_badge_url: 'https://api-assets.clashofclans.com/badges/200/5TuBZjMO479ySwCTYdYFBKGxrGH1gJESY6gWLl0MYDs.png', // L2Y8CUP badge
        result: 'win'
    }

    try {
        // 3. Insérer/Update l'historique
        const { data: savedWar, error: warError } = await client
            .from('war_history')
            .upsert(warData, { onConflict: 'clan_tag, end_date' })
            .select()
            .single()

        if (warError) throw new Error(`Error inserting war_history: ${warError.message}`)

        // 4. Participants (16 réels + 14 fictifs)
        const realParticipants = [
            { name: 'attila', tag: '#2JGPQVGCU', th: 17, pos: 1, stars: 4, dest: 166, attacks: 2 },
            { name: 'Dan', tag: '#LVQQ0CJL9', th: 17, pos: 2, stars: 4, dest: 168, attacks: 2 },
            { name: 'SuperNovazz', tag: '#8VGVPR9L', th: 17, pos: 3, stars: 6, dest: 200, attacks: 2 },
            { name: 'Damien', tag: '#JQQJLLCQ', th: 17, pos: 4, stars: 4, dest: 161, attacks: 2 },
            { name: 'Mac Mini', tag: '#PJL2LRJ8Q', th: 17, pos: 5, stars: 5, dest: 172, attacks: 2 },
            { name: '-Akdak-', tag: '#YJQV280Q', th: 17, pos: 6, stars: 5, dest: 194, attacks: 2 },
            { name: 'Jacquard', tag: '#Q29YCY2RY', th: 17, pos: 7, stars: 6, dest: 200, attacks: 2 },
            { name: 'Clasheur', tag: '#QPJPUY8P2', th: 17, pos: 8, stars: 4, dest: 150, attacks: 2 },
            { name: '⚡️M R T Z⚡️', tag: '#GLUUQ0QL', th: 17, pos: 9, stars: 2, dest: 68, attacks: 1 },
            { name: 'Martinezz', tag: '#8QJGURJY8', th: 17, pos: 10, stars: 0, dest: 0, attacks: 0 },
            { name: 'Nathan19', tag: '#20GQ8PV0', th: 17, pos: 11, stars: 4, dest: 197, attacks: 2 },
            { name: 'Zejonat', tag: '#98CL20QJ', th: 17, pos: 12, stars: 4, dest: 186, attacks: 2 },
            { name: 'dimitri', tag: '#LR2YGPUYU', th: 17, pos: 13, stars: 5, dest: 183, attacks: 2 },
            { name: 'Xben™', tag: '#8CUVPJGY', th: 17, pos: 14, stars: 6, dest: 200, attacks: 2 },
            { name: 'Newt_', tag: '#G2JV8CJ9', th: 17, pos: 15, stars: 6, dest: 200, attacks: 2 },
            { name: 'Guiluche le fou', tag: '#LJPR2V0P', th: 17, pos: 16, stars: 3, dest: 100, attacks: 1 },
        ]

        const fillerParticipants = []
        for (let i = 17; i <= 30; i++) {
            fillerParticipants.push({
                name: `Soldat ${i}`,
                tag: `#SIM${i}XXXX`,
                th: 16,
                pos: i,
                stars: Math.floor(Math.random() * 6),
                dest: Math.floor(Math.random() * 200),
                attacks: 2
            })
        }

        const allParticipants = [...realParticipants, ...fillerParticipants]

        const participantsData = allParticipants.map(p => ({
            war_id: savedWar.id,
            player_tag: p.tag,
            player_name: p.name,
            stars: p.stars,
            destruction: p.dest,
            attacks_count: p.attacks,
            town_hall_level: p.th,
            map_position: p.pos
        }))

        const { error: partError } = await client
            .from('war_participants')
            .upsert(participantsData, { onConflict: 'war_id, player_tag' })

        if (partError) throw new Error(`Error inserting war_participants: ${partError.message}`)

        return {
            success: true,
            message: `✅ Historique assigné au clan ${myClan.name} (${myClan.tag}).`,
            war: savedWar,
            participants_count: participantsData.length
        }

    } catch (err: any) {
        return {
            success: false,
            error: err.message
        }
    }
})
