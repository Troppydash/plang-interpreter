import { Paths, PathType } from "./path";

export const isNode =
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;

export interface PlInout {
    print: (message: string) => void;
    input: (message: string) => string | null;
    flush: () => void;

    paths: Paths;
    setRootPath: (rootFile: string) => void;
    readFile: (filePath: string, type: PathType) => string | null;

    execute: (code: string, vars: Record<string, any>) => void;
}

let inout: PlInout;
if ( isNode ) {
    inout = require("./nodeInout");
} else {
    inout = require('./otherInout');
}

export default inout;
