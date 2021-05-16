// This file is only used for command line use,
// import other modules if using in browser


// Starting repl
import { StartREPL } from "./repl";
import inout, { isNode } from "./inout";
import { ReadFile, RunEmitter, RunFile, RunParser } from "./linking";
import { CliArguments } from "./cli";
import { CliHandleMagicFlags } from "./cli/magic";
import { LogCliError } from "./cli/error";
import { AttemptPrettyPrint } from "./compiler/parsing/visualizer";
import { ProgramWithDebugToString } from "./vm/emitter/pprinter";

// Parse arguments
const args = CliArguments.Parse(process.argv);

// Arguments error
let error;
if ((error = args.getError()) != null) {
    LogCliError(process.argv, error);
    process.exit(1);
}

// Magic Flags
const cont = CliHandleMagicFlags(args);
if (!cont) {
    process.exit(0);
}


if (!isNode || args.raw.length == 0 || args.is("run-repl")) { // If running in repl
    const result = StartREPL("repl");
    process.exit(result);
} else { // Else if running a file
    const filePath = args.raw[0];
    const file = ReadFile(filePath);
    if (file == null) {
        process.exit(1);
    }

    // Different modes
    if (args.is("run-parser")) {
        const out = RunParser(file);
        if (out != null) {
            inout.print(AttemptPrettyPrint(RunParser(file)));
        }
        process.exit(0);
    }
    if (args.is("run-emitter")) {
        const out = RunEmitter(file);
        if (out != null) {
            inout.print(ProgramWithDebugToString(out));
            inout.print(`Emitted ${out.program.length} instructions, with ${out.debug.length} debug messages`);
        }
        process.exit(0);
    }

    // Default run vm
    (async () => {
        const result = await RunFile(file);
        process.exit(result);
    })();
}


