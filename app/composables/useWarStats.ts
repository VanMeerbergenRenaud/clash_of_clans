// app/composables/useWarStats.ts
import type { WarParticipant } from '~/types/war'

export const useWarStats = (participants: Ref<WarParticipant[]>) => {

    const stats = computed(() => {
        if (!participants.value) return { pending: [], bestDefenses: [], perfect: [], struggling: [] }

        const pending: WarParticipant[] = []
        const perfect: WarParticipant[] = []
        const struggling: WarParticipant[] = []

        participants.value.forEach((m) => {
            const attacks = m.attacks || []
            const attacksCount = attacks.length

            // Pending logic
            if (attacksCount < 2) {
                pending.push({ ...m })
            }

            // Perfect logic (Six Pack)
            if (attacksCount === 2 && attacks.every((a) => a.stars === 3)) {
                perfect.push({ ...m })
            }

            // Struggling logic (Has at least one attack with <= 1 star)
            if (attacks.some((a) => a.stars <= 1)) {
                struggling.push({ ...m })
            }
        })

        // Best Defenses Logic
        let bestDefenses = participants.value
            .filter((m) => m.bestOpponentAttack && m.bestOpponentAttack.stars < 3)
            .sort((a, b) => {
                if (!a.bestOpponentAttack || !b.bestOpponentAttack) return 0
                if (a.bestOpponentAttack.stars !== b.bestOpponentAttack.stars) {
                    return a.bestOpponentAttack.stars - b.bestOpponentAttack.stars
                }
                return a.bestOpponentAttack.destructionPercentage - b.bestOpponentAttack.destructionPercentage
            })

        // Apply limit logic: if > 15 candidates, show only <= 1 star
        if (bestDefenses.length > 15) {
            bestDefenses = bestDefenses.filter((m) => m.bestOpponentAttack!.stars <= 1)
        }

        return {
            pending: pending.sort((a, b) => a.mapPosition - b.mapPosition),
            bestDefenses,
            perfect,
            struggling: struggling.sort((a, b) => a.mapPosition - b.mapPosition)
        }
    })

    return {
        stats
    }
}
