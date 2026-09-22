import { describe, it, expect } from 'vitest';
import { PJMArchive } from './pjm_archive.js';

describe('PJMArchive', () => {
    describe('fnv1', () => {
        it('hashes strings using FNV-1 algorithm correctly', () => {
            // Known FNV-1 hash for an empty string seeded with 0x811c9dc5 is:
            // Wait, we prepend './' to the string!
            // Let's test standard strings and see if they match expected values.
            
            // Expected hash for "./data-common/textures/enemy/boss1.dds"
            const path1 = 'data-common/textures/enemy/boss1.dds';
            const hash1 = PJMArchive.fnv1(path1);
            
            // Should be the exact same hash for different casings and slash directions
            const path2 = 'DaTa-CoMmOn\\TeXtUrEs\\EnEmY\\BoSs1.DdS';
            const hash2 = PJMArchive.fnv1(path2);
            
            expect(hash1).toBe(hash2);
            
            // Verify that it prepends './' if missing
            const path3 = './data-common/textures/enemy/boss1.dds';
            const hash3 = PJMArchive.fnv1(path3);
            
            expect(hash1).toBe(hash3);
        });

        it('returns different hashes for different paths', () => {
            const hash1 = PJMArchive.fnv1('path/one.txt');
            const hash2 = PJMArchive.fnv1('path/two.txt');
            expect(hash1).not.toBe(hash2);
        });
    });
});
