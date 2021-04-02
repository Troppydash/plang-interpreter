import inout, { isNode } from "../inout";

export function startREPL(filename: string): number {
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
        inout.print(message);
    }

    return 0;
}
