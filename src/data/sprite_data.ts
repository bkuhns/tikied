export interface SpriteMeta {
    w: number;
    h: number;
}

export const gridOverrides: Record<string, {cols: number, rows: number}> = {
    "tree_beach": { cols: 2, rows: 4 }
};

export const SPRITE_SHEETS: Record<string, SpriteMeta> = {
    "tree_spring": { w: 128, h: 128 },
    "tree_summer": { w: 128, h: 128 },
    "tree_autumn": { w: 128, h: 128 },
    "tree_winter": { w: 128, h: 128 },
    "tree_swamp": { w: 128, h: 128 },
    "tree_bare": { w: 128, h: 128 },
    "tree_beach": { w: 128, h: 128 },
    "rock_1": { w: 128, h: 128 },
    "rock_1_winter": { w: 128, h: 128 },
    "log_obj": { w: 128, h: 128 },
    "stumps": { w: 128, h: 128 },
    "home": { w: 256, h: 128 },
    "home_grass": { w: 512, h: 128 },
    "gem_sign": { w: 128, h: 128 },
    "research_sign": { w: 128, h: 128 },
    "shadow": { w: 128, h: 64 },
    "bridge_s12": { w: 512, h: 256 },
    "bridge_s16": { w: 256, h: 256 },
    "bridge_s48": { w: 256, h: 256 },
    "bridge_s52a": { w: 256, h: 256 },
    "bridge_s52b": { w: 256, h: 256 },
    "stage79Bridge": { w: 1024, h: 128 },
    "new_wave": { w: 256, h: 256 },
    "hud_bar": { w: 2048, h: 128 }
};

export const SPRITE_PATHS: Record<string, string> = {
    "tree_spring": "data-common/textures/bgdata/objects/TreeSet_spring.dds",
    "tree_summer": "data-common/textures/bgdata/objects/TreeSet_summer1.dds",
    "tree_autumn": "data-common/textures/bgdata/objects/TreeSet_autumn1.dds",
    "tree_winter": "data-common/textures/bgdata/objects/TreeSet_winter1.dds",
    "tree_swamp": "data-common/textures/bgdata/objects/TreeSet_swamp1.dds",
    "tree_bare": "data-common/textures/bgdata/objects/TreeSet_bare1.dds",
    "tree_beach": "data-common/textures/bgdata/objects/TreeSet_beach.dds",
    "rock_1": "data-common/textures/bgdata/objects/rockSet1.dds",
    "rock_1_winter": "data-common/textures/bgdata/objects/snowrocks.dds",
    "log_obj": "data-common/textures/bgdata/objects/Log.dds",
    "stumps": "data-common/textures/bgdata/objects/Stumps_2x2.dds",
    "home": "data-common/textures/bgdata/objects/House1.dds",
    "home_grass": "data-common/textures/bgdata/objects/House1_ground.dds",
    "gem_sign": "data-common/textures/ingameui/main/gemsign.dds",
    "research_sign": "data-common/textures/ingameui/resource/researchsign.dds",
    "shadow": "data-common/textures/bgdata/objects/shadow.dds",
    "bridge_s12": "data-common/textures/bgdata/objects/bridge_s12.dds",
    "bridge_s16": "data-common/textures/bgdata/objects/bridge_s16.dds",
    "bridge_s48": "data-common/textures/bgdata/objects/swampBridge.dds",
    "bridge_s52a": "data-common/textures/bgdata/objects/stage52BridgeA.dds",
    "bridge_s52b": "data-common/textures/bgdata/objects/stage52BridgeB.dds",
    "stage79Bridge": "data-common/textures/bgdata/objects/stage79Bridge.dds",
    "new_wave": "data-common/textures/effects/NewWave.dds",
    "hud_bar": "data-common/textures/frontend/shared/pixeljunkbar.dds"
};

export const NEGATIVE_ROCK_MAPPING: Record<number, number> = {
    0: 0,
    "-1": 1,
    "-2": 6,
    "-3": 7,
    "-4": 4,
    "-5": 14,
    "-6": 3,
    "-7": 9,
    "-8": 10,
    "-9": 11,
    "-10": 2,
    "-11": 13,
    "-12": 15,
    "-13": 5,
    "-14": 12,
    "-15": 8
};
