import { PathType } from "./path";
import * as fs from 'fs';
import * as path from 'path';
import * as ps from 'prompt-sync';
import * as psh from 'prompt-sync-history';
import { MaskedEval } from "./proxy";

function complete( commands ) {
    return function ( str ) {
        if (str.length == 0) {
            return [];
        }
        let ret = [];
        for ( let i = 0; i < commands.length; i++ ) {
            if (commands[i] == str) {
                return [];
            }
            if ( commands[i].indexOf( str ) == 0 )
                ret.push( commands[i] );
        }
        return ret;
    };
}

// list of common keywords
const ac = "func impl import for as select export return break continue if elif else each loop while match case default and or not in print input list dict true false null Int Str Null List Dict Func Type";
const prompt = ps( {
    history: psh(),
    autocomplete: complete( ac.split( ' ' ) )
} );

export function print( message ) {
    console.log(message);
}

export function flush() {
    return;
}

export function input( message ) {
    return prompt( message );
}

export let paths = {
    cliPath: process.cwd(),
    exePath: process.execPath,
    rootPath: process.execPath
}

export function setRootPath( rootFile: string ) {
    paths.rootPath = path.join( paths.cliPath, path.dirname( rootFile ) );
}

export function readFile( filePath: string, type: PathType ) {
    try {
        const absPath = path.join( paths[type], filePath );
        return fs.readFileSync( absPath, { encoding: 'utf8', flag: 'r' } );
    } catch {
        return null;
    }
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
        require: p => {
            return require(path.join(paths.rootPath, p));
        },
        global,
        ...vars,
    });
}

export let options = {
    mode: "debug",
    run: "file",
};
