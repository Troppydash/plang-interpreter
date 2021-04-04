import * as path from "path";
import { PathType } from "./path";

export function print( message ) {
    alert(message)
}

export function input( message ) {
    return prompt(message);
}

export function flush(message) {
    // doesnt do anything
}

export let paths = {
    cliPath: '/',
    exePath: '/',
    rootPath: '/'
}

export function setRootPath(rootFile: string) {
    paths.rootPath = path.dirname(rootFile);
}

export function readFile(filePath: string, type: PathType) {
    return null;
}
