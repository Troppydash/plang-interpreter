import { PlProblem } from "./problem";
import { LogProblem } from "./printer";


export function ReportProblem(problem: PlProblem, content: string) {
    LogProblem(problem, content);
}
