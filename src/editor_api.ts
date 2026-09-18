import { StageSettings, StageParser } from './stage_parser.js';
import { Route, RoutesRenderer } from './routes_renderer.js';
import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';

export interface SpriteInstance {
    x: number;
    y: number;
    z?: number;
    type: string;
    ani: number;
    r: number;
    g: number;
    b: number;
    alpha?: number;
    scale?: number;
}

export interface StageDecorations {
    trees: SpriteInstance[];
    rocks: SpriteInstance[];
    bridges: SpriteInstance[];
    objects: SpriteInstance[];
    typesToLoad: Set<string>;
}

export interface GameDataGateway {
    // --- Read API ---
    getStageSettings(stageId: number): Promise<StageSettings | null>;
    getStageRoutes(stageId: number): Promise<Route[] | null>;
    getStageDecorations(stageId: number): Promise<StageDecorations | null>;
    
    getBarIconsImageData(): Promise<ImageData | null>;
    getStageBackground(stageId: number): Promise<ImageData | null>;
    getSpriteSheet(type: string, path: string): Promise<ImageData | null>;
    getWaterShader(): Promise<string | null>;
    getWaveTexture(): Promise<ImageData | null>;
    getStageThumbnails(): Promise<ImageData | null>;

    // --- Write API ---
    // NOTE: These are stubbed for now and act as no-ops. 
    saveStageSettings(stageId: number, settings: StageSettings): Promise<void>;
    saveStageRoutes(stageId: number, routes: Route[]): Promise<void>;
    saveStageDecorations(stageId: number, decorations: StageDecorations): Promise<void>;
}

const BRIDGE_DATA: Record<string, SpriteInstance[]> = {
    "12": [ { type: "bridge_s12", x: 929, y: 852, z: 1, ani: 0, r: 1, g: 1, b: 1 } ],
    "16": [ { type: "bridge_s16", x: 920, y: 640, z: 1, ani: 0, r: 1, g: 1, b: 1 } ],
    "48": [
        { type: "bridge_s48", x: 164 - 160, y: 212 - 192, z: 1, ani: 0, r: 1, g: 1, b: 1 },
        { type: "bridge_s48", x: 164, y: 212, z: 1, ani: 0, r: 1, g: 1, b: 1 }
    ],
    "52": [
        { type: "bridge_s52a", x: 648, y: 544, z: 0, ani: 0, r: 1, g: 1, b: 1 },
        { type: "bridge_s52b", x: 1196, y: 628, z: 0, ani: 0, r: 1, g: 1, b: 1 }
    ],
    "79": [ { type: "stage79Bridge", x: 960 + 40, y: 512 + 412, z: 0, ani: 0, r: 1, g: 1, b: 1 } ],
    "91": [ { type: "stage79Bridge", x: 960 + 40, y: 512 + 412, z: 0, ani: 0, r: 1, g: 1, b: 1 } ]
};

export class PJMArchiveGateway implements GameDataGateway {
    private archive: PJMArchive;
    private pkdFile: File;

    constructor(archive: PJMArchive, pkdFile: File) {
        this.archive = archive;
        this.pkdFile = pkdFile;
    }

    async getStageSettings(stageId: number): Promise<StageSettings | null> {
        const itemPath = `data-common/stage_data/umd/stage${stageId}/item_data.txt`;
        const enemyPath = `data-common/stage_data/umd/stage${stageId}/enemy_data.txt`;
        
        const itemBytes = await this.archive.extractFile(this.pkdFile, itemPath);
        const enemyBytes = await this.archive.extractFile(this.pkdFile, enemyPath);
        
        if (!itemBytes || !enemyBytes) return null;

        const decoder = new TextDecoder();
        const itemTxt = decoder.decode(itemBytes);
        const enemyTxt = decoder.decode(enemyBytes);

        const itemData = StageParser.parseItemData(itemTxt);
        const enemyData = StageParser.parseEnemyData(enemyTxt);
        const enemyWaves = enemyData.waves;

        const waves = [];
        for (let i = 1; i <= 20; i++) {
            const waveId = `wave${i}`;
            const waveData = enemyWaves[waveId];
            if (waveData && waveData.subWaves.length > 0) {
                waves.push({
                    id: waveId,
                    subWaves: waveData.subWaves,
                    coinsTotal: itemData.waveCoins[waveId] || 0,
                    gemsTotal: itemData.waveGems[waveId] || 0,
                    startTime: waveData.startTime,
                    balloons: waveData.balloons,
                    hpUp: enemyData.hpUp[i - 1]
                });
            }
        }

        return {
            coinWorth: itemData.coinWorth,
            money1P: itemData.money1P,
            money2P_1: itemData.money2P_1,
            money2P_2: itemData.money2P_2,
            waves: waves
        };
    }

    async getStageRoutes(stageId: number): Promise<Route[] | null> {
        const roadPath = `data-common/stage_data/umd/stage${stageId}/road.txt`;
        const roadBytes = await this.archive.extractFile(this.pkdFile, roadPath);
        if (!roadBytes) return null;

        const text = new TextDecoder().decode(roadBytes);
        const renderer = new RoutesRenderer();
        renderer.parseRoadTxt(text);
        return renderer.getRoutes();
    }

    async getStageDecorations(stageId: number): Promise<StageDecorations | null> {
        const forestPath = `data-common/stage_data/umd/stage${stageId}/forestpos.txt`;
        const rockPath = `data-common/stage_data/umd/stage${stageId}/rockpos.txt`;
        
        const forestBytes = await this.archive.extractFile(this.pkdFile, forestPath);
        const rockBytes = await this.archive.extractFile(this.pkdFile, rockPath);
        
        const typesToLoad = new Set<string>();
        typesToLoad.add('hud_bar');
        
        const trees: SpriteInstance[] = [];
        const bridges: SpriteInstance[] = [];
        const objects: SpriteInstance[] = [];
        const rocks: SpriteInstance[] = [];

        // Populate bridges
        if (BRIDGE_DATA[stageId.toString()]) {
            for (const bridge of BRIDGE_DATA[stageId.toString()]) {
                typesToLoad.add(bridge.type);
                bridges.push({ ...bridge });
            }
        }
        
        if (forestBytes) {
            const text = new TextDecoder().decode(forestBytes);
            const regex = /MakeForest\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const type = match[3];
                typesToLoad.add(type);
                typesToLoad.add("shadow");
                
                const treeX = parseFloat(match[1]);
                const treeY = parseFloat(match[2]);
                
                trees.push({
                    x: treeX, y: treeY + 55, z: treeY - 1, type: "shadow", ani: 0, r: 1, g: 1, b: 1, alpha: 0.2
                });
                trees.push({
                    x: treeX, y: treeY, z: treeY, type: type, ani: parseInt(match[4], 10), r: parseFloat(match[5]), g: parseFloat(match[6]), b: parseFloat(match[7])
                });
            }
            
            const homeRegex = /home\.pos\s*=\s*vector\(([-0-9.]+),\s*([-0-9.]+)\);/g;
            const homeMatch = homeRegex.exec(text);
            if (homeMatch) {
                const hx = parseFloat(homeMatch[1]);
                const hy = parseFloat(homeMatch[2]);
                
                typesToLoad.add("home_grass");
                typesToLoad.add("home");
                typesToLoad.add("gem_sign");
                typesToLoad.add("research_sign");
                
                const isWinter = typesToLoad.has("tree_winter");
                const homeAni = isWinter ? 1 : 0;
                
                const grassX = hx; 
                const grassY = hy + 50; 
                objects.push({ x: grassX, y: grassY, z: -1, type: "home_grass", ani: homeAni, r: 1, g: 1, b: 1 });
                objects.push({ x: hx, y: hy, z: hy + 50, type: "home", ani: homeAni, r: 1, g: 1, b: 1 });
                
                const gemX = hx - 120;
                const gemY = hy + 50; 
                objects.push({ x: gemX, y: gemY, z: hy + 75, type: "gem_sign", ani: 0, r: 1, g: 1, b: 1 });

                const resX = hx - 122;
                const resY = hy; 
                objects.push({ x: resX, y: resY, z: hy + 100, type: "research_sign", ani: 0, r: 1, g: 1, b: 1 });
            }
        }
        
        if (rockBytes) {
            const text = new TextDecoder().decode(rockBytes);
            const regex = /MakeStdObj\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                let type = match[3];
                if (type === "rock_1" && typesToLoad.has("tree_winter")) {
                    type = "rock_1_winter";
                }
                
                typesToLoad.add(type);
                rocks.push({
                    x: parseFloat(match[1]), y: parseFloat(match[2]), type: type, ani: parseInt(match[4], 10), r: parseFloat(match[5]), g: parseFloat(match[6]), b: parseFloat(match[7])
                });
            }
        }

        return { trees, rocks, bridges, objects, typesToLoad };
    }

    async getBarIconsImageData(): Promise<ImageData | null> {
        const bytes = await this.archive.extractFile(this.pkdFile, "data-common/textures/frontend/shared/baricons.dds");
        if (!bytes) return null;
        return DDSDecoder.decodeToImageData(bytes, true);
    }

    async getStageBackground(stageId: number): Promise<ImageData | null> {
        const bgPath = `data-common/textures/bgdata/bg/stage${stageId}.dds`;
        const bytes = await this.archive.extractFile(this.pkdFile, bgPath);
        if (!bytes) return null;
        return DDSDecoder.decodeToImageData(bytes, true);
    }

    async getSpriteSheet(type: string, path: string): Promise<ImageData | null> {
        const bytes = await this.archive.extractFile(this.pkdFile, path);
        if (!bytes) return null;
        return DDSDecoder.decodeToImageData(bytes, true);
    }

    async getWaterShader(): Promise<string | null> {
        const shaderBytes = await this.archive.extractFile(this.pkdFile, "shaders/ps_2dwater.hlsl");
        if (!shaderBytes) return null;
        return new TextDecoder().decode(shaderBytes);
    }

    async getWaveTexture(): Promise<ImageData | null> {
        const waveBytes = await this.archive.extractFile(this.pkdFile, "data-common/textures/effects/NewWave.dds");
        if (!waveBytes) return null;
        return DDSDecoder.decodeToImageData(waveBytes, true);
    }

    async getStageThumbnails(): Promise<ImageData | null> {
        const bytes = await this.archive.extractFile(this.pkdFile, "data-common/textures/frontend/map/stage_thumbnails.dds");
        if (!bytes) return null;
        return DDSDecoder.decodeToImageData(bytes, true);
    }

    // --- WRITE API ---
    async saveStageSettings(stageId: number, settings: StageSettings): Promise<void> {
        // TODO: Implement translating StageSettings back into item_data.txt and enemy_data.txt
        console.log(`[No-op] Saving stage ${stageId} settings`, settings);
    }

    async saveStageRoutes(stageId: number, routes: Route[]): Promise<void> {
        // TODO: Implement translating Route arrays back into road.txt
        console.log(`[No-op] Saving stage ${stageId} routes`, routes);
    }

    async saveStageDecorations(stageId: number, decorations: StageDecorations): Promise<void> {
        // TODO: Implement translating SpriteInstances back into forestpos.txt and rockpos.txt
        console.log(`[No-op] Saving stage ${stageId} decorations`, decorations);
    }
}
