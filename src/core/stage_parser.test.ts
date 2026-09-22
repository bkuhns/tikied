import { describe, it, expect } from 'vitest';
import { StageParser } from './stage_parser.js';

describe('StageParser', () => {
    describe('parseEnemyData', () => {
        it('parses basic ground wave correctly', () => {
            const luaCode = `
                global stage_data =
                {
                    wave1 =
                    {
                        {
                            type = "basic_ground",
                            weight = 2.0,
                            count  = 5,
                            route  = 1,
                        },
                        start_time = 3.5,
                    },
                };
            `;
            
            const result = StageParser.parseEnemyData(luaCode);
            expect(result.waves).toHaveProperty('wave1');
            const wave1 = result.waves['wave1'];
            
            expect(wave1.startTime).toBe(3.5);
            expect(wave1.subWaves).toHaveLength(1);
            
            const subWave = wave1.subWaves[0];
            expect(subWave.monster.id).toBe('basic_ground');
            expect(subWave.weight).toBe(2.0);
            expect(subWave.count).toBe(5);
            expect(subWave.route).toBe(1);
            expect(subWave.carry).toBe(false);
        });

        it('parses carry flag correctly', () => {
            const luaCode = `
                global stage_data =
                {
                    wave2 =
                    {
                        {
                            type = "basic_ground",
                            count = 1,
                            carry = true,
                        },
                    },
                };
            `;
            
            const result = StageParser.parseEnemyData(luaCode);
            const wave2 = result.waves['wave2'];
            
            expect(wave2.balloons).toBe(true);
            expect(wave2.subWaves).toHaveLength(1);
            expect(wave2.subWaves[0].carry).toBe(true);
        });

        it('handles missing optional fields by applying defaults', () => {
            const luaCode = `
                global stage_data =
                {
                    wave3 =
                    {
                        {
                            type = "boss_1",
                        },
                    },
                };
            `;
            
            const result = StageParser.parseEnemyData(luaCode);
            const wave3 = result.waves['wave3'];
            
            expect(wave3.startTime).toBeUndefined();
            expect(wave3.subWaves).toHaveLength(1);
            
            const subWave = wave3.subWaves[0];
            expect(subWave.monster.id).toBe('boss_1');
            expect(subWave.monster.baseHealth).toBe(0); // bosses have baseHealth 0 in definition mapping
            expect(subWave.weight).toBeUndefined();
            expect(subWave.count).toBe(1); // Default count is 1
            expect(subWave.route).toBeUndefined(); // Director applies default route 0
        });

        it('parses hpUp data', () => {
            const luaCode = `
                global EnemyHpUp =
                {
                    1.0, 1.2, 1.5,
                };
            `;
            
            const result = StageParser.parseEnemyData(luaCode);
            expect(result.hpUp).toEqual([1.0, 1.2, 1.5]);
        });
    });
});
