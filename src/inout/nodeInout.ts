import { PathType } from "./path";
import * as fs from 'fs';
import * as path from 'path';
import { PlBuffer } from "./buffer";

const prompt = require('prompt-sync')({
    history: require('prompt-sync-history')()
});

// stream buffering
const buffer = new PlBuffer();

export function print( message ) {
    const exceed = buffer.push(message);
    if (exceed) {
        console.log(buffer.empty().join('\n'));
    }
}

export function flush() {
    if (!buffer.isEmpty()) {
        console.log(buffer.empty().join('\n'));
    }
}

export function input( message ) {
    flush();
    return prompt(message);
}

export let paths = {
    cliPath: process.cwd(),
    exePath: process.execPath,
    rootPath: process.execPath
}

export function setRootPath(rootFile: string) {
    paths.rootPath = path.join(paths.cliPath, path.dirname(rootFile));
}

export function readFile(filePath: string, type: PathType) {
    try {
        const absPath = path.join(paths[type], filePath);
        return fs.readFileSync(absPath, {encoding: 'utf8', flag: 'r'});
    } catch {
        return null;
    }
}
