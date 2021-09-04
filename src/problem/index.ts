import { PlProblem } from "./problem";
import {LogCallbackProblem, LogProblem, LogTrace} from "./printer";
import {Inout} from "../inout";
import { colors } from "../inout/color";
import { PlTrace } from "./trace";


export function ReportProblem(problem: PlProblem, content: string) {
    Inout().print(colors.red("Problem(s) Occurred"));
    Inout().print(LogProblem(problem, content));
    Inout().flush();
}

export function ReportProblems(content: string, problems: PlProblem[], trace?: PlTrace): boolean {
    Inout().print(colors.red("Problem(s) Occurred"));
    if (trace && trace.length > 2) {
        Inout().print(colors.red('Callframes (Most Recent Last)'));
        Inout().print(LogTrace(trace));
        Inout().print('');
    }
    try {
        for (const problem of problems) {
            Inout().print(LogProblem(problem, content));
        }
    } catch (e) {
        Inout().print(`${colors.red("Exception")} in reporting the problems: ${e}`);
        Inout().print("This is a developer error, please report this to him");
        Inout().flush();
        return false;
    }
    if (Inout().options["mode"] != "debug") {
        Inout().print(colors.green("\nTo see a more detailed error, pass '--mode-debug' when running from cli"));
    }

    Inout().flush();
    return true;
}

// DEPRECATED, unused when there is no content in the stack machine
export function ReportCallbackProblems(problem: PlProblem, trace: PlTrace): boolean {
    Inout().print(colors.red("Callback Problem(s) Occurred"));
    if (trace.length == 0) {
        Inout().print(colors.red('No Callframes'))
    } else {
        Inout().print(colors.red('Callframes:'));
        Inout().print(LogTrace(trace));
    }
    Inout().print('');

    try {
        Inout().print(LogCallbackProblem(problem));
    } catch (e) {
        Inout().print(`Exception in reporting the problems: ${e}`);
        Inout().print("This is a developer error, please report this to him");
        Inout().flush();
        return false;
    }
    Inout().flush();
    return true;
}


