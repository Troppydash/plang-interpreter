import { PlProblem } from "./problem";
import { LogProblem, LogTrace } from "./printer";
import inout from "../inout";
import { colors } from "../inout/color";
import { PlTrace } from "./trace";


export function ReportProblem(problem: PlProblem, content: string) {
    inout.print(colors.red("Problem(s) Occurred"));
    inout.print(LogProblem(problem, content));
    inout.flush();
}

export function ReportProblems(content: string, problems: PlProblem[], trace?: PlTrace): boolean {
    inout.print(colors.red("Problem(s) Occurred"));
    if (trace && trace.length > 0) {
        inout.print(colors.red('\nCallframes (Most Recent Last)'));
        inout.print(LogTrace(trace));
        inout.print('');
    }
    try {
        for (const problem of problems) {
            inout.print(LogProblem(problem, content));
        }
    } catch (e) {
        inout.print(`Exception in reporting the problems: ${e}`);
        inout.print("This is a developer error, please report this to him");
        inout.flush();
        return false;
    }

    inout.flush();
    return true;
}


