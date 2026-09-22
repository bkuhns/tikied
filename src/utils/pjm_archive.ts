import * as pako from 'pako';

export interface ArchiveEntry {
    uncompressedSize: number;
    compressedSize: number;
    offset: number;
    hash: number;
}

export interface ReplacementFile {
    uncompressedSize: number;
    compressedSize: number;
    compressedData: Uint8Array;
}

export class PJMArchive {
    entries: ArchiveEntry[] = [];
    version: number = 3;

    /**
     * Parses the PKIWIN index file.
     */
    static async parse(pkiFile: File): Promise<PJMArchive> {
        const buffer = await pkiFile.arrayBuffer();
        const dataView = new DataView(buffer);
        
        const archive = new PJMArchive();
        archive.version = dataView.getUint32(0, true);
        const padding = dataView.getUint32(4, true); // Should be 0
        const numFiles = dataView.getUint32(8, true);

        let offset = 12;
        for (let i = 0; i < numFiles; i++) {
            archive.entries.push({
                uncompressedSize: dataView.getUint32(offset, true),
                compressedSize: dataView.getUint32(offset + 4, true),
                offset: dataView.getUint32(offset + 8, true),
                hash: dataView.getUint32(offset + 12, true)
            });
            offset += 16;
        }

        return archive;
    }

    /**
     * Hashes a string using the FNV-1 algorithm, matching the game's internal hashing.
     * Automatically normalizes the path by prepending './' if missing and converting to lowercase.
     */
    static fnv1(str: string): number {
        // The game engine hashes paths as lowercase and prefixed with './'
        let normalized = str.toLowerCase().replace(/\\/g, '/');
        if (!normalized.startsWith('./')) {
            normalized = './' + normalized;
        }

        let h = 0x811c9dc5;
        for (let i = 0; i < normalized.length; i++) {
            h = Math.imul(h, 0x01000193) ^ normalized.charCodeAt(i);
        }
        return h >>> 0; // Convert to unsigned 32-bit integer
    }

    /**
     * Repacks the archive entirely in the browser using Blob slicing for zero memory overhead.
     */
    async repack(pkdFile: File, replacements: Map<number, ReplacementFile>): Promise<{pkiBlob: Blob, pkdBlob: Blob}> {
        const newEntries: ArchiveEntry[] = [];
        const pkdChunks: Blob[] = [];
        
        // Write the pkdwin header (12 bytes: [version=3] [padding=0] [numFiles])
        const pkdHeader = new ArrayBuffer(12);
        const pkdHeaderView = new DataView(pkdHeader);
        pkdHeaderView.setUint32(0, this.version, true);
        pkdHeaderView.setUint32(4, 0, true);
        pkdHeaderView.setUint32(8, this.entries.length, true);
        pkdChunks.push(new Blob([pkdHeader]));

        let currentOffset = 12;

        for (const entry of this.entries) {
            let dataChunk: Blob | Uint8Array;
            let uncompSize = entry.uncompressedSize;
            let compSize = entry.compressedSize;

            if (replacements.has(entry.hash)) {
                // Use the modified, compressed data
                const rep = replacements.get(entry.hash)!;
                dataChunk = rep.compressedData;
                uncompSize = rep.uncompressedSize;
                compSize = rep.compressedSize;
            } else {
                // Pluck the unmodified chunk directly from the original File handle on disk!
                dataChunk = pkdFile.slice(entry.offset, entry.offset + entry.compressedSize);
            }

            pkdChunks.push(dataChunk instanceof Uint8Array ? new Blob([dataChunk as any]) : dataChunk);
            newEntries.push({
                uncompressedSize: uncompSize,
                compressedSize: compSize,
                offset: currentOffset,
                hash: entry.hash
            });

            currentOffset += compSize;
        }

        // Build the new PKIWIN index buffer
        // 12-byte header + 16 bytes per entry + up to 16 bytes alignment padding
        const pkiSize = 12 + newEntries.length * 16;
        const paddingNeeded = (16 - (pkiSize % 16)) % 16;
        const pkiBuffer = new ArrayBuffer(pkiSize + paddingNeeded);
        const view = new DataView(pkiBuffer);

        // Write Header
        view.setUint32(0, this.version, true);
        view.setUint32(4, 0, true); // padding
        view.setUint32(8, newEntries.length, true);

        // Write Entries
        let offset = 12;
        for (const entry of newEntries) {
            view.setUint32(offset, entry.uncompressedSize, true);
            view.setUint32(offset + 4, entry.compressedSize, true);
            view.setUint32(offset + 8, entry.offset, true);
            view.setUint32(offset + 12, entry.hash, true);
            offset += 16;
        }

        return {
            pkiBlob: new Blob([pkiBuffer]),
            pkdBlob: new Blob(pkdChunks)
        };
    }

    /**
     * Extracts a single file from the PKDWIN archive and decompresses it.
     */
    async extractFile(pkdFile: File, path: string): Promise<Uint8Array | null> {
        const hash = PJMArchive.fnv1(path);
        const entry = this.entries.find(e => e.hash === hash);
        if (!entry) return null;

        const slice = pkdFile.slice(entry.offset, entry.offset + entry.compressedSize);
        const buffer = await slice.arrayBuffer();
        const compressedData = new Uint8Array(buffer);
        
        try {
            // Decompress ZLIB chunk
            return pako.inflate(compressedData);
        } catch (e) {
            console.error(`Failed to decompress file ${path}`, e);
            return null;
        }
    }
}
