export interface WarAttack {
    attackerTag: string
    defenderTag: string
    stars: number
    destructionPercentage: number
    order: number
}

export interface WarDefense {
    stars: number
    destructionPercentage: number
    attackerTag?: string
    attackerName?: string
}

export interface WarParticipant {
    tag: string
    name: string
    mapPosition: number
    townHallLevel: number
    attacks: WarAttack[]
    // Derived or Stored Defense Data
    bestOpponentAttack?: WarDefense
    // Helper for UI
    attacksCount?: number
    totalStars?: number
    avgDestruction?: number
}
