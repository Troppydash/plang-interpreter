import { PathType } from "./path";
import { PlBuffer } from "./buffer";
import { MaskedEval } from "./proxy";

// see if there is global.extern
const g = Function('return this')();
const extern = g ? (g as any).extern : globalThis.extern;

const buffer = new PlBuffer();

export function print( message ) {
    if (extern && extern.print) {
        return extern.print(message);
    }
    if (buffer.push(message)) {
        alert(buffer.empty().join('\n'));
    }
}

export function input( message ) {
    if (extern && extern.input) {
        return extern.input(message);
    }

    flush();
    return prompt(message);
}

export function flush() {
    if (extern && extern.flush) {
        return extern.flush();
    }


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

export function execute(code: string, vars: Record<string, any>): void {
    MaskedEval(code, {
        console,
        Math,
        Date,
        Object,
        Number,
        Array,
        String,
        Function,
        Boolean,
        Symbol,
        Error,
        BigInt,
        RegExp,
        Map,
        Set,
        JSON,
        Promise,
        document,
        window,
        ...vars,
    });
}

export let options = {
    mode: "debug",
    run: "file",
};
