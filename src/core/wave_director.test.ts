import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaveDirector, QueuedMonsterSpawn } from './wave_director.js';

describe('WaveDirector', () => {
    let director: WaveDirector;
    let spawnLogs: QueuedMonsterSpawn[];

    beforeEach(() => {
        director = new WaveDirector();
        spawnLogs = [];
        director.onSpawnMonster = (spawn) => {
            spawnLogs.push(spawn);
        };
    });

    it('should spawn monsters over time based on their subwave weight (interval)', () => {
        director.startPreview([
            {
                startTime: 2.0,
                balloons: false,
                subWaves: [
                    {
                        monster: { id: 'basic_ground', baseName: 'Pine', iconIndex: 0, isShielded: false, isMagicResistant: false, isCold: false, isOnFire: false, baseHealth: 3 },
                        count: 3,
                        route: 1,
                        weight: 1.5,
                        carry: false
                    }
                ]
            }
        ]);

        // activeMonsterCount mock
        let activeCount = 0;
        const getActiveCount = () => activeCount;

        // Init: delay timer is running
        expect(director.currentWave).toBeNull();
        director.update(1.0, getActiveCount);
        expect(director.currentWave).toBeNull();
        expect(spawnLogs).toHaveLength(0);

        // Delay timer expires, wave starts
        director.update(1.0, getActiveCount); // waveDelayTimer hits 0.0
        director.update(0.01, getActiveCount); // timer > 0 is false, waveTime = 0.01
        expect(director.currentWave).not.toBeNull();
        expect(spawnLogs).toHaveLength(1); // 1st monster spawned at waveTime = 0
        activeCount++;

        // Next monster spawns at 1.5s
        director.update(1.4, getActiveCount); // waveTime = 1.41
        expect(spawnLogs).toHaveLength(1);
        
        director.update(0.1, getActiveCount); // waveTime = 1.51
        expect(spawnLogs).toHaveLength(2); // 2nd monster spawned
        activeCount++;

        // Next monster spawns at 3.0s
        director.update(1.5, getActiveCount); // waveTime = 3.01
        expect(spawnLogs).toHaveLength(3); // 3rd monster spawned
        activeCount++;

        // All monsters spawned, check if wave is finished
        // Assuming monsters are still active
        director.update(1.0, getActiveCount);
        expect(director.currentWave).not.toBeNull(); // wave should still be active because activeCount > 0

        // Monsters die
        activeCount = 0;
        director.update(0.1, getActiveCount);
        expect(director.currentWave).toBeNull(); // wave is now complete
    });

    it('should not instantly cancel the wave if all monsters spawn on the first frame', () => {
        director.startPreview([
            {
                startTime: undefined, // 0
                balloons: false,
                subWaves: [
                    {
                        monster: { id: 'boss_1', baseName: 'Idol', iconIndex: 0, isShielded: false, isMagicResistant: false, isCold: false, isOnFire: false, baseHealth: 0 },
                        count: 1, // Only 1 monster, spawns at time 0
                        route: 0,
                        weight: 2.0,
                        carry: false
                    }
                ]
            }
        ]);

        // Use a mock active count that reflects what happens in the real app:
        // When onSpawnMonster is called, the active count goes up immediately.
        let activeCount = 0;
        director.onSpawnMonster = (spawn) => {
            activeCount++;
        };

        const getActiveCount = () => activeCount;

        // On first update, the director will process the spawn queue and then check if the wave is done.
        director.update(1 / 60, getActiveCount);
        
        // Since activeCount became 1 during the spawn process, the wave should NOT be cancelled.
        expect(activeCount).toBe(1);
        expect(director.currentWave).not.toBeNull();
    });

    it('should emit appropriate active wave indices', () => {
        const waveChanges: (number | null)[] = [];
        director.onActiveWaveChange = (idx) => waveChanges.push(idx);

        director.startPreview([
            {
                startTime: 0, balloons: false, subWaves: [
                    { monster: { id: 'm1', baseName: 'M1', iconIndex: 0, isShielded: false, isMagicResistant: false, isCold: false, isOnFire: false, baseHealth: 1 }, count: 1, route: 0, weight: 1.0, carry: false }
                ]
            }, // Wave 0
            {
                startTime: 1.0, balloons: false, subWaves: [
                    { monster: { id: 'm2', baseName: 'M2', iconIndex: 0, isShielded: false, isMagicResistant: false, isCold: false, isOnFire: false, baseHealth: 1 }, count: 1, route: 0, weight: 1.0, carry: false }
                ]
            }  // Wave 1
        ]);

        let activeCount = 0;
        director.onSpawnMonster = () => { activeCount++; };
        const getActiveCount = () => activeCount;

        // Wave 0 starts
        director.update(0.1, getActiveCount);
        expect(waveChanges).toContain(0);
        expect(director.currentWave).not.toBeNull();

        // Wave 0 finishes
        activeCount = 0;
        director.update(0.1, getActiveCount);
        // It should transition to null, then immediately start Wave 1's delay
        expect(waveChanges).toContain(null);
        
        // Wait for Wave 1's delay to finish
        director.update(1.0, getActiveCount);
        director.update(0.01, getActiveCount);
        expect(waveChanges).toContain(1);

        // Wave 1 finishes
        activeCount = 0;
        director.update(0.1, getActiveCount);
        
        // Final transition to null when preview completes
        expect(waveChanges[waveChanges.length - 1]).toBe(null);
    });
});
