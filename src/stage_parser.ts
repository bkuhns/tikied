export interface MonsterDef {
    id: string; // The raw string from the file (e.g., 'basic_physical')
    baseName: string; // The core monster family (e.g., 'Pine')
    iconIndex: number; // The sprite sheet index
    isShielded: boolean;
    isMagicResistant: boolean;
    isCold: boolean;
    isOnFire: boolean;
    baseHealth: number;
}

export interface SubWave {
    monster: MonsterDef;
    count: number;
    weight?: number;
    route?: number;
    startTime?: number;
    endTime?: number;
}

export interface WaveInfo {
    id: string; // e.g., "wave1"
    subWaves: SubWave[];
    coinsTotal: number;
    gemsTotal: number;
    startTime?: number;
    balloons?: boolean;
    hpUp?: number;
}

export interface StageSettings {
    coinWorth: number;
    money1P: number;
    money2P_1: number;
    money2P_2: number;
    waves: WaveInfo[];
}

export class StageParser {
    public static parseItemData(text: string) {
        // Strip block and line comments to avoid false matches
        text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

        const coinWorthMatch = text.match(/global\s+g_coin_worth\s*=\s*(\d+);/);
        
        const m0Matches = [...text.matchAll(/GameState\.money_0\s*=\s*(\d+);/g)];
        const m1Matches = [...text.matchAll(/GameState\.money_1\s*=\s*(\d+);/g)];

        const coinWorth = coinWorthMatch ? parseInt(coinWorthMatch[1]) : 10;
        
        let money1P = 0;
        let money2P_1 = 0;
        let money2P_2 = 0;

        if (m0Matches.length > 0) money1P = parseInt(m0Matches[0][1]);
        if (m0Matches.length > 1) money2P_1 = parseInt(m0Matches[1][1]);
        if (m1Matches.length > 1) money2P_2 = parseInt(m1Matches[1][1]);

        // Parse wave_coin_total
        const waveCoins: Record<string, number> = {};
        const coinBlockMatch = text.match(/global\s+wave_coin_total\s*=\s*\{([^}]*)\}/);
        if (coinBlockMatch) {
            const matches = coinBlockMatch[1].matchAll(/(wave\d+)\s*=\s*(\d+)/g);
            for (const match of matches) {
                waveCoins[match[1]] = parseInt(match[2]);
            }
        }

        // Parse wave_gem_total
        const waveGems: Record<string, number> = {};
        const gemBlockMatch = text.match(/global\s+wave_gem_total\s*=\s*\{([^}]*)\}/);
        if (gemBlockMatch) {
            const matches = gemBlockMatch[1].matchAll(/(wave\d+)\s*=\s*(\d+)/g);
            for (const match of matches) {
                waveGems[match[1]] = parseInt(match[2]);
            }
        }

        return { coinWorth, money1P, money2P_1, money2P_2, waveCoins, waveGems };
    }

    public static parseMonsterDef(id: string, onFire: boolean): MonsterDef {
        let baseName = "Unknown";
        let iconIndex = 0;
        let baseHealth = 0;
        let isShielded = id.includes("_physical");
        let isMagicResistant = id.includes("_magic");
        let isCold = id.includes("cold_");

        if (id.includes("basic_ground") || id.includes("basic_magic") || id.includes("basic_physical")) {
            baseName = "Pine";
            iconIndex = 0;
            baseHealth = 3;
        } else if (id.includes("strong_ground") || id.includes("strong_magic") || id.includes("strong_physical")) {
            baseName = "Giant";
            iconIndex = 1;
            baseHealth = 9;
        } else if (id.includes("running_ground") || id.includes("running_magic") || id.includes("running_physical")) {
            baseName = "Spider";
            iconIndex = 2;
            baseHealth = 4;
        } else if (id.includes("basic_fly")) {
            baseName = "Sycamore";
            iconIndex = 3;
            baseHealth = 3;
        } else if (id.includes("running_fly")) {
            baseName = "Bat";
            iconIndex = 5; // user set 5
            baseHealth = 4;
        } else if (id.includes("strong_fly")) {
            baseName = "Bee";
            iconIndex = 6; // user set 6
            baseHealth = 9;
        } else if (id.includes("strong_running_ground")) {
            baseName = "Scuttler";
            iconIndex = 14; // user set 14
            baseHealth = 8;
        } else if (id === "boss_1") {
            baseName = "Bronze Idol";
            iconIndex = 7;
        } else if (id === "boss_2") {
            baseName = "Earth Tower";
            iconIndex = 8;
        } else if (id === "boss_3") {
            baseName = "Snail Beast";
            iconIndex = 10;
        } else if (id === "boss_4") {
            baseName = "Giant Bug";
            iconIndex = 9;
        }

        return {
            id,
            baseName,
            iconIndex,
            isShielded,
            isMagicResistant,
            isCold,
            isOnFire: onFire,
            baseHealth
        };
    }

    public static parseEnemyData(text: string) {
        // Strip block and line comments to avoid false matches
        text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

        const hpUpMatch = text.match(/global\s+EnemyHpUp\s*=\s*\{([\s\S]*?)\};/);
        const hpUp: number[] = [];
        if (hpUpMatch) {
            // Split by commas
            const lines = hpUpMatch[1].split('\n');
            for (const line of lines) {
                const clean = line.trim();
                if (clean) {
                    const parts = clean.split(',');
                    for (const part of parts) {
                        const val = part.trim();
                        if (val) {
                            hpUp.push(parseFloat(val));
                        }
                    }
                }
            }
        }

        const stageDataMatch = text.match(/global\s+stage_data\s*=\s*\{([\s\S]*?)\n};/);
        const waves: Record<string, {subWaves: SubWave[], startTime?: number, balloons?: boolean}> = {};

        if (stageDataMatch) {
            const content = stageDataMatch[1];
            // Wait, GameMonkey syntax allows nested braces. 
            // A simpler approach is to split by "wave\d+ =" and manually count braces.
            const blocks = content.split(/wave\d+\s*=\s*\{/);
            const waveNames = [...content.matchAll(/(wave\d+)\s*=\s*\{/g)].map(m => m[1]);

            for (let i = 0; i < waveNames.length; i++) {
                const waveName = waveNames[i];
                // block[0] is everything before the first wave.
                const blockStr = blocks[i + 1];
                
                const subWaves: SubWave[] = [];
                // Look for inner objects: { type = "x", count = y }
                const subWaveRegex = /\{([^}]*type\s*=\s*[^}]*)\}/g;
                let subMatch;
                while ((subMatch = subWaveRegex.exec(blockStr)) !== null) {
                    const props = subMatch[1];
                    const typeMatch = props.match(/type\s*=\s*"([^"]+)"/);
                    const countMatch = props.match(/count\s*=\s*(\d+)/);
                    const routeMatch = props.match(/route\s*=\s*(\d+)/);
                    const startMatch = props.match(/start_time\s*=\s*([\d.]+)/);
                    const intervalMatch = props.match(/weight\s*=\s*([\d.]+)/);
                    const onFireMatch = props.match(/on_fire\s*=\s*true/i);
                    if (typeMatch) {
                        const monster = StageParser.parseMonsterDef(typeMatch[1], onFireMatch !== null);
                        subWaves.push({
                            monster,
                            count: countMatch ? parseInt(countMatch[1]) : 1,
                            route: routeMatch ? parseInt(routeMatch[1]) : undefined,
                            startTime: startMatch ? parseFloat(startMatch[1]) : undefined,
                            weight: intervalMatch ? parseFloat(intervalMatch[1]) : undefined
                        });
                    }
                }

                // Look for wave-level start/end time.
                // We should carefully avoid matching the ones inside sub-waves.
                // A quick hack is to remove the matched subwave blocks first.
                const wavePropsStr = blockStr.replace(subWaveRegex, '');
                const waveStartMatch = wavePropsStr.match(/start_time\s*=\s*([\d.]+)/);
                const balloonsMatch = blockStr.match(/carry\s*=\s*true/i);

                waves[waveName] = {
                    subWaves: subWaves,
                    startTime: waveStartMatch ? parseFloat(waveStartMatch[1]) : undefined,
                    balloons: balloonsMatch !== null
                };
            }
        }

        return { waves, hpUp };
    }
}