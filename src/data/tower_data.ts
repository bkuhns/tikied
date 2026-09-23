export interface TowerInfo {
    id: string; // Identifier from tower.gm (e.g., 'AAGun', 'Arrow')
    name: string; // Human-readable name
    bullet_id: string | null; // The bullet type from bullet.gm (e.g., 'aabullet', 'arrow')
}

export const TOWER_DATA: Record<string, TowerInfo> = {
    "Arrow": {
        id: "Arrow",
        name: "Arrow Tower",
        bullet_id: "arrow"
    },
    "Cannon": {
        id: "Cannon",
        name: "Cannon Tower",
        bullet_id: "cannon"
    },
    "AAGun": {
        id: "AAGun",
        name: "Anti-Air Gun Tower",
        bullet_id: "aabullet"
    },
    "Ice": {
        id: "Ice",
        name: "Ice Tower",
        bullet_id: "ice"
    },
    "Fire": {
        id: "Fire",
        name: "Fire Tower",
        bullet_id: "fire"
    },
    "Laser": {
        id: "Laser",
        name: "Laser Tower",
        bullet_id: "laser"
    },
    "Lightning": {
        id: "Lightning",
        name: "Lightning Tower",
        bullet_id: "lightning"
    },
    "Mortar": {
        id: "Mortar",
        name: "Mortar Tower",
        bullet_id: "mortar"
    },
    "Tesla": {
        id: "Tesla",
        name: "Tesla Tower",
        bullet_id: "tesla"
    },
    "Hive": {
        id: "Hive",
        name: "Hive Tower",
        bullet_id: "aircraft"
    },
    "Trap": {
        id: "Trap",
        name: "Trap Tower",
        bullet_id: "trap"
    },
    "Keiken": {
        id: "Keiken",
        name: "Keiken Tower",
        bullet_id: null
    }
};
