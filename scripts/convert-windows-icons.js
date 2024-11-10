// npm install png-to-ico --save-dev

const pngToIco = require('png-to-ico');
const fs = require('fs');

async function convertToIco(inputPath) {
    try {
        const buf = await pngToIco(inputPath);
        fs.writeFileSync('build/icon.ico', buf);
        console.log('Successfully created icon.ico');
    } catch (err) {
        console.error('Error converting icon:', err);
    }
}

// Usage: node convert-windows-icon.js path/to/your/icon.png
convertToIco([process.argv[2]]);