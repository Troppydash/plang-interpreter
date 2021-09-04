import { CliArguments } from "./index";
import {StartDemo} from "../repl";
import  {Inout} from "../inout";
import {colors} from "../inout/color";
import {PNAME} from "./constants";
import {LogProblemList} from "../problem/printer";

export function CliHandleMagicFlags(args: CliArguments): boolean {

    if (args.is("help")) {
        Inout().print(`Usage: ${PNAME} ...flags [file] ...program_arguments

${colors.cyan('Examples')}
${PNAME} code.de                  ~ Run the file called [code.de]
${PNAME}                          ~ Start the repl
${PNAME} --run-emitter code.de    ~ Run the file called [code.de] with the emitter only 

${colors.cyan('Flags')} (all flags begin with '--')
help            ~ Show this message

run-repl        ~ Start the repl (default method if no [file] is supplied
run-demo        ~ Start the repl in demo mode
run-compiler    ~ Run [file] with the compiler only
run-emitter     ~ Run [file] with the emitter only
run-highlighter ~ Display [file] contents with a syntax highlighter

view-problems   ~ View problems in detail. View all problems if there is no arguments.

mode-debug      ~ Run [file] in debug mode, will show more detailed errors
mode-release    ~ Run [file] in release mode, have no detailed errors
`);
        return false;
    }

    if (args.is("view-problems")) {
        Inout().print(LogProblemList(args.getArgs()));
        return false;
    }

    if (args.is("run-demo")) {
        StartDemo("demo");
        return false;
    }

    if (args.is("mode-release")) {
        // bad way, but it is a singleton so whatever
        Inout().options["mode"] = "release";
    }

    if (args.is("run-demo") || args.is("run-repl") || args.raw.length == 0) {
        Inout().options["run"] = "repl";
    }




    return true;
}
