import inout, { isNode } from "../inout";
import {RunLinker, RunParser} from "../linking";

export function StartREPL( filename: string ): number {
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
        // const tokens = RunLinker(message, filename);
        // if (tokens !== null) {
        //     for (const token of tokens) {
        //         inout.print(PlTokenToString(token));
        //     }
        // }
        const tree = RunParser(message, filename);
        // inout.print(ASTProgramToString(tree));
        console.log(tree);
    }

    inout.flush();
    return 0;
}
