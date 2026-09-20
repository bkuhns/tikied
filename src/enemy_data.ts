export interface EnemyKindInfo {
    name: string;
    max_speed: number;
    sprite_type: string;
    screen_size?: number;
    anim_type?: 'walk' | 'rock' | 'scuttle' | 'fly' | 'boss_hop' | 'boss_pulse' | 'boss_fly';
    fps?: number;
}

export const ENEMY_KIND_MAP: Record<string, EnemyKindInfo> = {
    "basic_ground": { name: "basic_ground", max_speed: 1.0, sprite_type: "enemy_basic_walk", screen_size: 1.0, anim_type: 'walk', fps: 8 },
    "strong_ground": { name: "strong_ground", max_speed: 0.8, sprite_type: "enemy_strong_walk", screen_size: 1.5, anim_type: 'rock', fps: 6 },
    "running_ground": { name: "running_ground", max_speed: 2.0, sprite_type: "enemy_running_walk", screen_size: 1.0, anim_type: 'scuttle', fps: 12 },
    "cold_basic_ground": { name: "cold_basic_ground", max_speed: 1.0, sprite_type: "enemy_basic_walk", screen_size: 1.1, anim_type: 'walk', fps: 8 },
    "cold_strong_ground": { name: "cold_strong_ground", max_speed: 0.8, sprite_type: "enemy_strong_walk", screen_size: 2.4, anim_type: 'rock', fps: 6 },
    "cold_running_ground": { name: "cold_running_ground", max_speed: 2.0, sprite_type: "enemy_running_walk", screen_size: 1.6, anim_type: 'scuttle', fps: 12 },
    "basic_magic": { name: "basic_magic", max_speed: 1.0, sprite_type: "enemy_basic_walk", screen_size: 1.1, anim_type: 'walk', fps: 8 },
    "strong_magic": { name: "strong_magic", max_speed: 0.8, sprite_type: "enemy_strong_walk", screen_size: 2.4, anim_type: 'rock', fps: 6 },
    "running_magic": { name: "running_magic", max_speed: 2.0, sprite_type: "enemy_running_walk", screen_size: 1.6, anim_type: 'scuttle', fps: 12 },
    "basic_physical": { name: "basic_physical", max_speed: 1.0, sprite_type: "enemy_basic_walk", screen_size: 1.0, anim_type: 'walk', fps: 8 },
    "strong_physical": { name: "strong_physical", max_speed: 0.8, sprite_type: "enemy_strong_walk", screen_size: 2.2, anim_type: 'rock', fps: 6 },
    "running_physical": { name: "running_physical", max_speed: 2.0, sprite_type: "enemy_running_walk", screen_size: 1.6, anim_type: 'scuttle', fps: 12 },
    "basic_fly": { name: "basic_fly", max_speed: 1.0, sprite_type: "enemy_basic_fly", screen_size: 1.0, anim_type: 'fly', fps: 8 },
    "strong_fly": { name: "strong_fly", max_speed: 0.8, sprite_type: "enemy_strong_fly", screen_size: 1.0, anim_type: 'fly', fps: 8 },
    "running_fly": { name: "running_fly", max_speed: 2.0, sprite_type: "enemy_running_fly", screen_size: 1.0, anim_type: 'fly', fps: 12 },
    "strong_running_ground": { name: "strong_running_ground", max_speed: 1.75, sprite_type: "enemy_strong_running", screen_size: 1.0, anim_type: 'rock', fps: 10 },
    "boss_1": { name: "boss_1", max_speed: 0.4, sprite_type: "enemy_boss_1", screen_size: 1.0, anim_type: 'boss_hop', fps: 0 },
    "boss_2": { name: "boss_2", max_speed: 0.5, sprite_type: "enemy_boss_2", screen_size: 1.0, anim_type: 'boss_pulse', fps: 6 },
    "boss_3": { name: "boss_3", max_speed: 0.6, sprite_type: "enemy_boss_3", screen_size: 1.0, anim_type: 'scuttle', fps: 10 },
    "boss_4": { name: "boss_4", max_speed: 0.6, sprite_type: "enemy_boss_4", screen_size: 1.0, anim_type: 'boss_fly', fps: 8 }
};

export const ENEMY_SPRITE_PATHS: Record<string, string> = {
    "enemy_basic_walk": "data-common/textures/enemy/basic.dds",
    "enemy_strong_walk": "data-common/textures/enemy/basic_hard.dds",
    "enemy_running_walk": "data-common/textures/enemy/basic_fast.dds",
    "enemy_basic_fly": "data-common/textures/enemy/flying_basic.dds",
    "enemy_strong_fly": "data-common/textures/enemy/flying_hard.dds",
    "enemy_running_fly": "data-common/textures/enemy/flying_fast.dds",
    "enemy_strong_running": "data-common/textures/enemy/hard_fast.dds",
    "enemy_boss_1": "data-common/textures/enemy/boss1.dds",
    "enemy_boss_2": "data-common/textures/enemy/boss2.dds",
    "enemy_boss_3": "data-common/textures/enemy/boss3.dds",
    "enemy_boss_4": "data-common/textures/enemy/boss4.dds",
    "balloon": "data-common/textures/enemy/balloon.dds"
};

export const ENEMY_GRID_DIVISIONS: Record<string, { cols: number; rows: number }> = {
    "enemy_basic_walk": { cols: 4, rows: 2 },
    "enemy_basic_fly": { cols: 4, rows: 4 },
    "enemy_strong_fly": { cols: 4, rows: 4 },
    "enemy_running_walk": { cols: 2, rows: 4 },
    "enemy_running_fly": { cols: 2, rows: 4 },
    "enemy_strong_walk": { cols: 3, rows: 4 },
    "enemy_strong_running": { cols: 2, rows: 2 },
    "enemy_boss_1": { cols: 1, rows: 1 },
    "enemy_boss_2": { cols: 4, rows: 2 },
    "enemy_boss_3": { cols: 4, rows: 2 },
    "enemy_boss_4": { cols: 4, rows: 2 },
    "balloon": { cols: 1, rows: 6 }
};
