import fs from 'fs';
import path from 'path';

const publicDir = 'public';
const rootDir = '.';
const distDir = 'dist';

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    for (const file of files) {
        const srcPath = path.join(publicDir, file);
        if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, path.join(rootDir, file));
            fs.copyFileSync(srcPath, path.join(distDir, file));
            console.log(`Copied ${file} -> root & dist/`);
        }
    }
}
