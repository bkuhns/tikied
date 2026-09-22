import { WaveInfo } from './stage_parser.js';

export interface QueuedMonsterSpawn {
    spawnTime: number;
    type: string;
    routeIndex: number;
    carry: boolean;
    isOnFire: boolean;
    isCold: boolean;
}

export class WaveDirector {
    private allWaves: WaveInfo[] = [];
    private pendingWaves: WaveInfo[] = [];
    public currentWave: WaveInfo | null = null;
    
    private queuedSpawns: QueuedMonsterSpawn[] = [];
    private waveDelayTimer: number = 0;
    private waveTime: number = 0;

    public onSpawnMonster?: (spawnData: QueuedMonsterSpawn) => void;
    public onActiveWaveChange?: (waveIndex: number | null) => void;
    public onPreviewComplete?: () => void;

    public startPreview(waves: WaveInfo[]) {
        this.allWaves = [...waves];
        this.pendingWaves = [...waves];
        this.currentWave = null;
        
        if (this.pendingWaves.length > 0) {
            const firstWave = this.pendingWaves[0];
            this.waveDelayTimer = firstWave.startTime !== undefined ? firstWave.startTime : 0.0;
        }
    }

    public stopPreview() {
        this.allWaves = [];
        this.pendingWaves = [];
        this.currentWave = null;
        this.queuedSpawns = [];
    }

    public isPreviewing(): boolean {
        return this.currentWave !== null || this.pendingWaves.length > 0;
    }

    public update(dt: number, activeMonsterCount: number) {
        if (!this.isPreviewing()) return;

        // Check if we need to start the next wave
        if (!this.currentWave && this.pendingWaves.length > 0) {
            if (this.waveDelayTimer > 0) {
                this.waveDelayTimer -= dt;
            } else {
                // Start wave!
                const nextWave = this.pendingWaves.shift()!;
                this.currentWave = nextWave;
                
                const waveIdx = this.allWaves.indexOf(nextWave);
                if (this.onActiveWaveChange) {
                    this.onActiveWaveChange(waveIdx >= 0 ? waveIdx : null);
                }
                
                const queued: QueuedMonsterSpawn[] = [];
                const waveStartTime = 0;

                for (const subWave of nextWave.subWaves) {
                    const subWaveStart = waveStartTime + (subWave.startTime ?? 0);
                    const count = subWave.count;
                    const interval = subWave.weight ?? 1.0;
                    const routeIndex = subWave.route ?? 0;
                    const monsterDef = subWave.monster;

                    for (let k = 0; k < count; k++) {
                        queued.push({
                            spawnTime: subWaveStart + (k * interval),
                            type: monsterDef.id,
                            routeIndex,
                            carry: subWave.carry ?? false,
                            isOnFire: monsterDef.isOnFire,
                            isCold: monsterDef.isCold
                        });
                    }
                }

                queued.sort((a, b) => a.spawnTime - b.spawnTime);
                this.queuedSpawns = queued;
                this.waveTime = 0;
            }
        }

        if (this.currentWave) {
            this.waveTime += dt;

            // Spawn ready monsters
            while (this.queuedSpawns.length > 0 && this.queuedSpawns[0].spawnTime <= this.waveTime) {
                const item = this.queuedSpawns.shift()!;
                if (this.onSpawnMonster) {
                    this.onSpawnMonster(item);
                }
            }

            // Check if current wave is finished (all spawned AND all cleared)
            if (this.queuedSpawns.length === 0 && activeMonsterCount === 0) {
                this.currentWave = null;
                if (this.onActiveWaveChange) {
                    this.onActiveWaveChange(null);
                }

                if (this.pendingWaves.length > 0) {
                    const nextWave = this.pendingWaves[0];
                    this.waveDelayTimer = nextWave.startTime !== undefined ? nextWave.startTime : 5.0;
                } else {
                    // Preview finished!
                    if (this.onPreviewComplete) {
                        this.onPreviewComplete();
                    }
                }
            }
        }
    }
}
