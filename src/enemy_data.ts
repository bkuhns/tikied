export interface EnemyKindInfo {
    name: string;
    max_speed: number;
    sprite_type: string;
    screen_size?: number;
    anim_type?: 'walk' | 'rock' | 'scuttle' | 'fly' | 'boss_hop' | 'boss_pulse' | 'boss_fly';
    fps?: number;
    loop_style?: 'linear' | 'pingpong';
}

export const ENEMY_KIND_MAP: Record<string, EnemyKindInfo> = {
    "basic_ground":          { max_speed: 1.0,  screen_size: 1.0, fps: 60, name: "basic_ground",          sprite_type: "enemy_basic_walk",     anim_type: 'walk',       loop_style: 'pingpong' },
    "strong_ground":         { max_speed: 0.8,  screen_size: 1.0, fps: 12, name: "strong_ground",         sprite_type: "enemy_strong_walk",    anim_type: 'rock',       loop_style: 'linear' },
    "running_ground":        { max_speed: 2.0,  screen_size: 1.0, fps: 10, name: "running_ground",        sprite_type: "enemy_running_walk",   anim_type: 'scuttle',    loop_style: 'linear' },
    "cold_basic_ground":     { max_speed: 1.0,  screen_size: 1.0, fps: 60, name: "cold_basic_ground",     sprite_type: "enemy_basic_walk",     anim_type: 'walk',       loop_style: 'pingpong' },
    "cold_strong_ground":    { max_speed: 0.8,  screen_size: 1.0, fps: 12, name: "cold_strong_ground",    sprite_type: "enemy_strong_walk",    anim_type: 'rock',       loop_style: 'linear' },
    "cold_running_ground":   { max_speed: 2.0,  screen_size: 1.0, fps: 10, name: "cold_running_ground",   sprite_type: "enemy_running_walk",   anim_type: 'scuttle',    loop_style: 'linear' },
    "basic_magic":           { max_speed: 1.0,  screen_size: 1.0, fps: 60, name: "basic_magic",           sprite_type: "enemy_basic_walk",     anim_type: 'walk',       loop_style: 'pingpong' },
    "strong_magic":          { max_speed: 0.8,  screen_size: 1.0, fps: 12, name: "strong_magic",          sprite_type: "enemy_strong_walk",    anim_type: 'rock',       loop_style: 'linear' },
    "running_magic":         { max_speed: 2.0,  screen_size: 1.0, fps: 10, name: "running_magic",         sprite_type: "enemy_running_walk",   anim_type: 'scuttle',    loop_style: 'linear' },
    "basic_physical":        { max_speed: 1.0,  screen_size: 1.0, fps: 60, name: "basic_physical",        sprite_type: "enemy_basic_walk",     anim_type: 'walk',       loop_style: 'pingpong' },
    "strong_physical":       { max_speed: 0.8,  screen_size: 2.2, fps: 12, name: "strong_physical",       sprite_type: "enemy_strong_walk",    anim_type: 'rock',       loop_style: 'linear' },
    "running_physical":      { max_speed: 2.0,  screen_size: 1.6, fps: 10, name: "running_physical",      sprite_type: "enemy_running_walk",   anim_type: 'scuttle',    loop_style: 'linear' },
    "basic_fly":             { max_speed: 1.0,  screen_size: 1.0, fps: 12, name: "basic_fly",             sprite_type: "enemy_basic_fly",      anim_type: 'fly',        loop_style: 'linear' },
    "strong_fly":            { max_speed: 0.8,  screen_size: 1.0, fps: 12, name: "strong_fly",            sprite_type: "enemy_strong_fly",     anim_type: 'fly',        loop_style: 'linear' },
    "running_fly":           { max_speed: 2.0,  screen_size: 1.0, fps: 30, name: "running_fly",           sprite_type: "enemy_running_fly",    anim_type: 'fly',        loop_style: 'linear' },
    "strong_running_ground": { max_speed: 1.75, screen_size: 1.0, fps: 12, name: "strong_running_ground", sprite_type: "enemy_strong_running", anim_type: 'rock',       loop_style: 'pingpong' },
    "boss_1":                { max_speed: 0.4,  screen_size: 1.0, fps: 0,  name: "boss_1",                sprite_type: "enemy_boss_1",         anim_type: 'boss_hop',   loop_style: 'linear' },
    "boss_2":                { max_speed: 0.5,  screen_size: 1.0, fps: 5,  name: "boss_2",                sprite_type: "enemy_boss_2",         anim_type: 'boss_pulse', loop_style: 'pingpong' },
    "boss_3":                { max_speed: 0.6,  screen_size: 1.0, fps: 5,  name: "boss_3",                sprite_type: "enemy_boss_3",         anim_type: 'scuttle',    loop_style: 'pingpong' },
    "boss_4":                { max_speed: 0.6,  screen_size: 1.0, fps: 12, name: "boss_4",                sprite_type: "enemy_boss_4",         anim_type: 'boss_fly',   loop_style: 'pingpong' }
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

export const ENEMY_GRID_DIVISIONS: Record<string, { cols: number; rows: number; target_row?: number }> = {
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
    "enemy_boss_4": { cols: 4, rows: 2, target_row: 1 },  //< target_row for flying state.
    "balloon": { cols: 1, rows: 6 }
};
