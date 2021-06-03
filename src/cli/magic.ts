import { CliArguments } from "./index";
import {StartDemo} from "../repl";
import inout from "../inout";
import {colors} from "../inout/color";

export function CliHandleMagicFlags(args: CliArguments): boolean {

    if (args.is("help")) {
        const exe = process.platform == "win32" ? "devia.exe" : "./devia";
        inout.print(`Usage: ${exe} ...flags [file] ...program_arguments

${colors.cyan('Examples')}
${exe} code.de                  ~ Run the file called [code.de]
${exe}                          ~ Start the repl
${exe} --run-emitter code.de    ~ Run the file called [code.de] with the emitter only 

${colors.cyan('Flags')} (all flags begin with --)
help            ~ Show this message
run-repl        ~ Start the repl (default method if no [file] is supplied
run-demo        ~ Start the repl in demo mode
run-compiler    ~ Run [file] with the compiler only
run-emitter     ~ Run [file] with the emitter only
mode-debug      ~ Run [file] in debug mode, will show more detailed errors
mode-release    ~ Run [file] in release mode, have no detailed errors
`);
        return false;
    }

    if (args.is("run-demo")) {
        StartDemo("demo");
        return false;
    }

    if (args.is("mode-release")) {
        // bad way, but it is a singleton so whatever
        inout.options["mode"] = "release";
        return true;
    }



    return true;
}
