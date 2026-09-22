import { SpriteInstance } from '../utils/editor_api.js';

export const BRIDGE_DATA: Record<string, SpriteInstance[]> = {
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
