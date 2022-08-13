import {PathType} from "./path";
import * as fs from 'fs';
import * as path from 'path';
import {MaskedEval} from "./proxy";
import * as readline from "readline";
import * as deasync from 'deasync';
import * as colorReadline from 'node-color-readline';
import {Formatter} from "./index";


/// HELPERS ///
function complete(commands) {
    return function (str) {
        if (str.length == 0) {
            return [];
        }
        let ret = [];
        for (let i = 0; i < commands.length; i++) {
            if (commands[i] == str) {
                return [];
            }
            if (commands[i].indexOf(str) == 0)
                ret.push(commands[i]);
        }
        return ret;
    };
}

// list of common keywords
const ac = "func impl import for as select export return break continue if elif else each loop while match case default and or not in print input list dict true false null Int Str Null List Dict Func Type";

// TODO: Fix this
export function richRead(prompt: string, nextLine: (text: string) => boolean, formatter: Formatter, callback) {
    let input = [];

    const rl = colorReadline.createInterface({
        input: process.stdin,
        output: process.stdout,
        colorize: function (text: string) {
            try {
                return formatter(text);
            } catch (e) {
                return text;
            }
        }
    });

    rl.setPrompt(prompt);

    rl.on('line', cmd => {
        input.push(cmd);
        const text = input.join('\n');
        let next;
        try {
            next = nextLine(text);
        } catch (e) {
            next = false;
        }

        if (next) {
            rl.setPrompt(`${('' + (input.length + 1)).padStart(prompt.length-2, ' ')}| `);
            rl.prompt();
            const lastLine = input[input.length-1].trimEnd();
            rl.write(' '.repeat(lastLine.length - lastLine.trimStart().length));
            if (lastLine.length > 0) {
                const lastChar = lastLine[lastLine.length-1];
                if (['{', '('].includes(lastChar)) {
                    rl.write('  ');
                }
            }
        } else {
            rl.close();
            callback(null, text);
        }
    })

    rl.on("SIGINT", function () {
        rl.close();
        console.log('^C');

        if (input.length === 0) {
            callback(null, null)
        } else {
            callback( null, input.join('\n'))
        }
    });

    rl.prompt();
}

function read(prompt: string, callback): readline.Interface {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,

    });

    rl.question(prompt, answer => {
        rl.close();
        callback(null, answer);
    })

    rl.on("SIGINT", function () {
        rl.close();
        console.log('^C');
        callback(null, null)
    });

    return rl;
}

/// EXPORTS ///
const readSync = deasync(read);
const richReadSync = deasync(richRead);

export function print(message, end = '\n') {
    process.stdout.write(message + end);

}

export function flush() {
    return;
}

export function input(message) {
    return readSync(message);
}

export function richInput(message, nextLine, formatter) {
    return richReadSync(message, nextLine, formatter);
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
        process,
        global,
        ...vars,
    });
}

export let options = {
    mode: "debug",
    run: "file",
};
