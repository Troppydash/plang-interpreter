import { PathType } from "./path";
import { PlBuffer } from "./buffer";


const buffer = new PlBuffer();

export function print( message ) {
    if (buffer.push(message)) {
        alert(buffer.empty().join('\n'));
    }
}

export function input( message ) {
    flush();
    return prompt(message);
}

export function flush() {
    if (!buffer.isEmpty()) {
        alert(buffer.empty().join('\n'));
    }
}

export let paths = {
    cliPath: '/',
    exePath: '/',
    rootPath: '/'
}

export function setRootPath(rootFile: string) {
    paths.rootPath = rootFile;
}

export function readFile(filePath: string, type: PathType) {
    return null;
}
