export interface BulletDamageMultipliers {
    // State Types (Shields)
    cold: number;      // Ice Shield
    elec: number;      // Lightning Shield (unused in game)
    physical: number;  // Physical Shield
    magic: number;     // Magic Shield

    // Body Types
    normal: number;    // Pines/Normal
    strong: number;    // Giants
    fast: number;      // Spiders
    boss: number;      // Bosses

    // Movement Types
    walk: number;      // Ground enemies
    fly: number;       // Flying enemies
}

export interface BulletInfo {
    id: string; // Identifier from bullet.gm (e.g., 'aabullet', 'explosion')
    multipliers: BulletDamageMultipliers;
}

export const BULLET_DATA: Record<string, BulletInfo> = {
    "arrow": {
        id: "arrow",
        multipliers: { cold: 0.25, elec: 1, physical: 0.25, magic: 1, normal: 1, strong: 0.3, fast: 2, boss: 0.99, walk: 1, fly: 1 }
    },
    "cannon": {
        id: "cannon",
        multipliers: { cold: 0.25, elec: 1, physical: 0.25, magic: 1, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "aabullet": {
        id: "aabullet",
        multipliers: { cold: 0.25, elec: 1, physical: 0, magic: 1, normal: 1, strong: 0.5, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "ice": {
        id: "ice",
        multipliers: { cold: 0, elec: 1, physical: 1.5, magic: 0.3, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "fire": {
        id: "fire",
        multipliers: { cold: 2, elec: 1, physical: 1, magic: 0.25, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "laser": {
        id: "laser",
        multipliers: { cold: 1, elec: 0, physical: 1, magic: 1, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 2 }
    },
    "lightning": {
        id: "lightning",
        multipliers: { cold: 1, elec: 0.5, physical: 1, magic: 0.25, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "mortar": {
        id: "mortar",
        multipliers: { cold: 0.25, elec: 1, physical: 0.25, magic: 1, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "tesla": {
        id: "tesla",
        multipliers: { cold: 1, elec: 0, physical: 1, magic: 0.25, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    },
    "explosion": {
        id: "explosion",
        multipliers: { cold: 1, elec: 1, physical: 0.3, magic: 1, normal: 1, strong: 1, fast: 1, boss: 1, walk: 1, fly: 1 }
    }
};
