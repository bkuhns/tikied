export class DDSDecoder {
    /**
     * Decodes a 32-bit uncompressed RGB DDS file (common in PJM backgrounds) 
     * and draws it to an HTML Canvas, applying a vertical flip.
     */
    static drawToCanvas(ddsData: Uint8Array, canvas: HTMLCanvasElement): void {
        const magic = new TextDecoder().decode(ddsData.slice(0, 4));
        if (magic !== "DDS ") {
            throw new Error("Not a valid DDS file.");
        }

        const dataView = new DataView(ddsData.buffer, ddsData.byteOffset, ddsData.byteLength);
        
        // Header starts after magic.
        const height = dataView.getUint32(12, true);
        const width = dataView.getUint32(16, true);
        
        // Pixel format flags at offset 80
        const flags = dataView.getUint32(80, true);
        const isRGB = (flags & 0x40) !== 0; // DDPF_RGB
        const rgbBitCount = dataView.getUint32(88, true);

        if (!isRGB || rgbBitCount !== 32) {
            throw new Error(`Unsupported DDS format (Flags: 0x${flags.toString(16)}, Bits: ${rgbBitCount}). Expected 32-bit uncompressed RGB.`);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context.");

        const imageData = ctx.createImageData(width, height);
        const pixels = imageData.data;

        // DDS header is 128 bytes. The pixel data follows immediately.
        let offset = 128;
        
        // PJM DDS files are typically stored upside down (bottom-to-top), so we flip them vertically here.
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                const b = ddsData[offset++];
                const g = ddsData[offset++];
                const r = ddsData[offset++];
                const a = ddsData[offset++]; // Usually ignored or 0xff in PJM backgrounds

                // Calculate the pixel index in the flipped ImageData
                const destIdx = (y * width + x) * 4;

                pixels[destIdx] = r;
                pixels[destIdx + 1] = g;
                pixels[destIdx + 2] = b;
                pixels[destIdx + 3] = 255; // Force full opacity since BG A mask is 0
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }
}
