#!/usr/bin/env node
'use strict';

const fs = require('fs');
const stamp = new Date().toISOString();
fs.writeFileSync('./src/timestamp/index.ts', `export const timestamp = '${stamp}';`);
