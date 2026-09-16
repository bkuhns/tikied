export class DDSDecoder {
    static decodeToImageData(ddsData: Uint8Array, flipVertical: boolean = false): ImageData {
        const magic = new TextDecoder().decode(ddsData.slice(0, 4));
        if (magic !== "DDS ") throw new Error("Not a valid DDS file.");

        const dataView = new DataView(ddsData.buffer, ddsData.byteOffset, ddsData.byteLength);
        const height = dataView.getUint32(12, true);
        const width = dataView.getUint32(16, true);
        const flags = dataView.getUint32(80, true);
        
        const isRGB = (flags & 0x40) !== 0;
        const isFourCC = (flags & 0x4) !== 0;
        const fourCC = isFourCC ? new TextDecoder().decode(ddsData.slice(84, 88)) : "";

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        const imageData = ctx.createImageData(width, height);
        
        if (isRGB && dataView.getUint32(88, true) === 32) {
            this.decodeUncompressed(ddsData, imageData, width, height, 128, flipVertical);
        } else if (isFourCC && fourCC === "DXT5") {
            this.decodeDXT5(ddsData, imageData, width, height, 128, flipVertical);
        } else {
            throw new Error(`Unsupported DDS format (Flags: 0x${flags.toString(16)}, FourCC: ${fourCC}).`);
        }
        return imageData;
    }

    private static decodeUncompressed(ddsData: Uint8Array, imageData: ImageData, width: number, height: number, offset: number, flipVertical: boolean) {
        const pixels = imageData.data;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const b = ddsData[offset++];
                const g = ddsData[offset++];
                const r = ddsData[offset++];
                const a = ddsData[offset++];
                
                const targetY = flipVertical ? height - 1 - y : y;
                const destIdx = (targetY * width + x) * 4;
                pixels[destIdx] = r;
                pixels[destIdx + 1] = g;
                pixels[destIdx + 2] = b;
                pixels[destIdx + 3] = 255; 
            }
        }
    }

    private static decodeDXT5(ddsData: Uint8Array, imageData: ImageData, width: number, height: number, offset: number, flipVertical: boolean) {
        const pixels = imageData.data;
        const dataView = new DataView(ddsData.buffer, ddsData.byteOffset, ddsData.byteLength);
        const bw = Math.max(1, Math.floor((width + 3) / 4));
        const bh = Math.max(1, Math.floor((height + 3) / 4));

        for (let by = 0; by < bh; by++) {
            for (let bx = 0; bx < bw; bx++) {
                const blockOffset = offset + (by * bw + bx) * 16;
                
                // Decode Alpha
                const a0 = ddsData[blockOffset];
                const a1 = ddsData[blockOffset + 1];
                const alphaIndices = BigInt(dataView.getUint32(blockOffset + 2, true)) | (BigInt(dataView.getUint16(blockOffset + 6, true)) << 32n);
                
                const alphas = new Uint8Array(8);
                alphas[0] = a0;
                alphas[1] = a1;
                if (a0 > a1) {
                    alphas[2] = Math.floor((6 * a0 + 1 * a1) / 7);
                    alphas[3] = Math.floor((5 * a0 + 2 * a1) / 7);
                    alphas[4] = Math.floor((4 * a0 + 3 * a1) / 7);
                    alphas[5] = Math.floor((3 * a0 + 4 * a1) / 7);
                    alphas[6] = Math.floor((2 * a0 + 5 * a1) / 7);
                    alphas[7] = Math.floor((1 * a0 + 6 * a1) / 7);
                } else {
                    alphas[2] = Math.floor((4 * a0 + 1 * a1) / 5);
                    alphas[3] = Math.floor((3 * a0 + 2 * a1) / 5);
                    alphas[4] = Math.floor((2 * a0 + 3 * a1) / 5);
                    alphas[5] = Math.floor((1 * a0 + 4 * a1) / 5);
                    alphas[6] = 0;
                    alphas[7] = 255;
                }

                // Decode Color
                const c0 = dataView.getUint16(blockOffset + 8, true);
                const c1 = dataView.getUint16(blockOffset + 10, true);
                const colorIndices = dataView.getUint32(blockOffset + 12, true);
                
                const r0 = ((c0 >> 11) & 0x1f) * (255 / 31);
                const g0 = ((c0 >> 5) & 0x3f) * (255 / 63);
                const b0 = (c0 & 0x1f) * (255 / 31);
                const r1 = ((c1 >> 11) & 0x1f) * (255 / 31);
                const g1 = ((c1 >> 5) & 0x3f) * (255 / 63);
                const b1 = (c1 & 0x1f) * (255 / 31);

                const colors = new Float32Array(16);
                colors[0] = r0; colors[1] = g0; colors[2] = b0; colors[3] = 255;
                colors[4] = r1; colors[5] = g1; colors[6] = b1; colors[7] = 255;
                colors[8] = (2 * r0 + r1) / 3; colors[9] = (2 * g0 + g1) / 3; colors[10] = (2 * b0 + b1) / 3; colors[11] = 255;
                colors[12] = (r0 + 2 * r1) / 3; colors[13] = (g0 + 2 * g1) / 3; colors[14] = (b0 + 2 * b1) / 3; colors[15] = 255;

                for (let py = 0; py < 4; py++) {
                    for (let px = 0; px < 4; px++) {
                        const actualX = bx * 4 + px;
                        const actualY = by * 4 + py;
                        if (actualX >= width || actualY >= height) continue;

                        const pixelIndex = py * 4 + px;
                        const aIndex = Number((alphaIndices >> BigInt(pixelIndex * 3)) & 7n);
                        const cIndex = (colorIndices >> (pixelIndex * 2)) & 3;

                        const targetY = flipVertical ? height - 1 - actualY : actualY;
                        const destIdx = (targetY * width + actualX) * 4;
                        
                        pixels[destIdx] = colors[cIndex * 4];
                        pixels[destIdx + 1] = colors[cIndex * 4 + 1];
                        pixels[destIdx + 2] = colors[cIndex * 4 + 2];
                        pixels[destIdx + 3] = alphas[aIndex];
                    }
                }
            }
        }
    }
}
