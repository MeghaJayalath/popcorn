
const fs = require('fs');
const path = require('path');

const root = path.resolve('../../node_modules');

function getDirSize(dirPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        return 0;
    }
    return size;
}

try {
    const dirs = fs.readdirSync(root);
    const sizes = [];
    for (const dir of dirs) {
        const p = path.join(root, dir);
        if (fs.statSync(p).isDirectory()) {
            sizes.push({ name: dir, size: getDirSize(p) });
        }
    }

    sizes.sort((a, b) => b.size - a.size);
    console.log('Top 20 largest folders in node_modules:');
    sizes.slice(0, 20).forEach(s => {
        console.log(`${s.name}: ${(s.size / 1024 / 1024).toFixed(2)} MB`);
    });
} catch (e) {
    console.error(e);
}
