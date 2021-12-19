#!/usr/bin/env node
'use strict';


const fs = require('fs');
const path = require('path');

const pjson = fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString();
const json = JSON.parse(pjson);
const version = json.version;

const stamp = new Date().toISOString();
if (!fs.existsSync("./src/timestamp")) {
    fs.mkdirSync("./src/timestamp");
}
fs.writeFileSync('./src/timestamp/index.ts', `export const timestamp = '${stamp}'; export const version = '${version}'`);
