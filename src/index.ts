// This file is only used for command line use,
// import other modules if using in browser


// Starting repl
import {StartREPL} from "./repl";
import {Inout, isNode} from "./inout";
import {ReadFile, RunEmitter, RunHighlighter, RunParser, RunVM, RunVmFast} from "./linking";
import {CliArguments} from "./cli";
import {CliHandleMagicFlags} from "./cli/magic";
import {LogCliError} from "./cli/error";
import {ASTProgramToString} from "./compiler/parsing/visualizer";
import {PlProgramToString} from "./vm/emitter/printer";

function main() {
    // Parse arguments
    const striped = process.argv.slice(2);
    const args = CliArguments.Parse(striped);

    // Arguments error
    let error;
    if ((error = args.getError()) != null) {
        LogCliError(striped, error);
        return 1
    }

    // Magic Flags
    const cont = CliHandleMagicFlags(args);
    if (!cont) {
        return 0
    }


    if (!isNode || args.getArgSize() == 0 || args.is("run-repl")) { // If running in repl
        return StartREPL("repl");
    } else { // Else if running a file
        const filePath = args.getArgFirst();
        const file = ReadFile(filePath);
        if (file == null) {
            return 1
        }

        // read extras
        const extras = args.option("lib");
        if (extras) {
            for (const fp of extras.split(',')) {
                const f = ReadFile(fp);
                if (f == null) {
                    return 1;
                }
                file.content = f.content + '\n' + file.content;
            }
        }


        // Different modes
        if (args.is("run-compiler")) {
            const out = RunParser(file);
            if (out != null) {
                Inout().print(ASTProgramToString(RunParser(file)));
            }
            return 0;
        }
        if (args.is("run-emitter")) {
            const out = RunEmitter(file);
            if (out != null) {
                Inout().print(PlProgramToString(out));
                Inout().print(`Emitted ${out.program.length} instructions, with ${out.debug.length} debug messages`);
            }
            return 0;
        }
        if (args.is('run-highlighter')) {
            RunHighlighter(file);
            return 0;
        }

        // Default run vm
        if (args.is("mode-release")) {
            return RunVmFast(file, args.getArgRest());
        }

        return RunVM(file, args.getArgRest());
    }
}


// TODO: change this all to to async, but have to let go deasync
process.exit(main());
// }
//
// main()
//     .then(process.exit)
//     .catch(err => {
//         console.error(err);
//         process.exit(1);
//     })



