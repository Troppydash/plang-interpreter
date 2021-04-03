// This file is only used for command line use,
// import other modules if using in browser


// Starting repl
import { StartREPL } from "./repl";
import inout, { isNode } from "./inout";

if (!isNode || process.argv.length !== 3) {
    const result = StartREPL("repl");
    process.exit(result);
}

inout.print("Running file");

process.exit(0);
