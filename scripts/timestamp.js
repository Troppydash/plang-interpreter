#!/usr/bin/env node
'use strict';


const fs = require('fs');
const stamp = new Date().toISOString();
if (!fs.existsSync("./src/timestamp")) {
    fs.mkdirSync("./src/timestamp");
}
fs.writeFileSync('./src/timestamp/index.ts', `export const timestamp = '${stamp}';`);
