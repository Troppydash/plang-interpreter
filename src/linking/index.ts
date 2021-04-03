import PlToken, { PlTokenType } from "../compiler/lexing/token";
import PlLexer from "../compiler/lexing";
import { ReportProblem } from "../problem";
import { NewPlFile } from "../inout/file";
import { NewPlProblem } from "../problem/problem";

export function RunLinker( content: string, filename: string): PlToken[] | null {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const result = lexer.parseAll();

    const last = result[result.length-1];
    if (last.type === PlTokenType.ERR) {
        const problem = NewPlProblem("LE0001", last.info, last.content);
        ReportProblem(problem, content);
        return null;
    }

    return result;
}
