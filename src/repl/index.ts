import inout, { isNode } from "../inout";
import { RunLinker } from "../linking";
import { PlTokenToString } from "../compiler/lexing/token";

export function StartREPL( filename: string): number {
    inout.print("Welcome to the Plang Interactive console");
    if (isNode) {
        const os = require('os');
        inout.print(`Running on ${os.platform()}-${os.arch()}. Hello ${os.hostname()}!`);
    }

    while (true) {
        const message = inout.input(`${filename}> `);
        if (message === null) {
            inout.print("Input terminated, goodbye");
            break;
        }

        // debug only
        // inout.print(message);
        // run stuff
        // const tokens = RunLinker(message, filename);
        const tokens = RunLinker("12 + 13\n5.5 + 6\n1 % 2\n7 + 5", filename);
        if (tokens !== null) {
            for (const token of tokens) {
                inout.print(PlTokenToString(token));
            }
        }
    }

    return 0;
}
