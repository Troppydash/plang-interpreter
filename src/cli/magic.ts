import { CliArguments } from "./index";
import {StartDemo} from "../repl";

export function CliHandleMagicFlags(args: CliArguments): boolean {

    if (args.is("run-demo")) {
        StartDemo("demo");
        return false;
    }


    return true;
}
