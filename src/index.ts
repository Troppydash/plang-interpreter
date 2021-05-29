// This file is only used for command line use,
// import other modules if using in browser


// Starting repl
import { StartREPL } from "./repl";
import inout, { isNode } from "./inout";
import {ReadFile, RunEmitter, RunParser, RunVM, RunVmRelease} from "./linking";
import { CliArguments } from "./cli";
import { CliHandleMagicFlags } from "./cli/magic";
import { LogCliError } from "./cli/error";
import { ASTProgramToString } from "./compiler/parsing/visualizer";
import { PlProgramToString } from "./vm/emitter/printer";

// Parse arguments
const striped = process.argv.slice(2);
const args = CliArguments.Parse(striped);

// Arguments error
let error;
if ((error = args.getError()) != null) {
    LogCliError(striped, error);
    process.exit(1);
}

// Magic Flags
const cont = CliHandleMagicFlags(args);
if (!cont) {
    process.exit(0);
}


if (!isNode || args.getArgSize() == 0 || args.is("run-repl")) { // If running in repl
    const result = StartREPL("repl");
    process.exit(result);
} else { // Else if running a file
    const filePath = args.getArgFirst();
    const file = ReadFile(filePath);
    if (file == null) {
        process.exit(1);
    }

    // Different modes
    if (args.is("run-compiler")) {
        const out = RunParser(file);
        if (out != null) {
            inout.print(ASTProgramToString(RunParser(file)));
        }
        process.exit(0);
    }
    if (args.is("run-emitter")) {
        const out = RunEmitter(file);
        if (out != null) {
            inout.print(PlProgramToString(out));
            inout.print(`Emitted ${out.program.length} instructions, with ${out.debug.length} debug messages`);
        }
        process.exit(0);
    }

    // Default run vm
    if (args.is("mode-release")) {
        const code = RunVmRelease(file, args.getArgRest());
        process.exit(code);
    }

    (async () => {
        const result = await RunVM(file, args.getArgRest());
        process.exit(result);
    })();
}


