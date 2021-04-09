// This file is only used for command line use,
// import other modules if using in browser


// Starting repl
import { StartREPL } from "./repl";
import { isNode } from "./inout";
import { RunFile } from "./linking";

if (!isNode || process.argv.length !== 3) {
    const result = StartREPL("repl");
    process.exit(result);
} else {
    // run file
    const result = RunFile(process.argv[2]);
    process.exit(result);
}

