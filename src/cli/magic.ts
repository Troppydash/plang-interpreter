import { CliArguments } from "./index";
import {StartDemo} from "../repl";
import inout from "../inout";

export function CliHandleMagicFlags(args: CliArguments): boolean {

    if (args.is("help")) {
        const exe = process.platform == "win32" ? "plang.exe" : "./plang";
        inout.print(`Usage: ${exe} ...flags [file] ...program_arguments

Flags (all flags begin with --pl-)
help            ~ Show this message
run-repl        ~ Start the repl (default method if no [file] is supplied
run-demo        ~ Start the repl in demo mode
run-compiler    ~ Run [file] with the compiler only
run-emitter     ~ Run [file] with the emitter only`);
        return false;
    }

    if (args.is("run-demo")) {
        StartDemo("demo");
        return false;
    }



    return true;
}
