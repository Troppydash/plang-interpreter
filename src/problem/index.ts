import { PlProblem } from "./problem";
import { LogProblem } from "./printer";
import inout from "../inout";
import { colors } from "../inout/color";


export function ReportProblem(problem: PlProblem, content: string) {
    inout.print(colors.red("Problem(s) Occurred"));
    LogProblem(problem, content);
    inout.flush();
}
