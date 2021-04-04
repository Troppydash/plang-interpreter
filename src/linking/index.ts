import PlToken, { PlTokenType } from "../compiler/lexing/token";
import PlLexer from "../compiler/lexing";
import { ReportProblem } from "../problem";
import { NewPlFile } from "../inout/file";
import { NewPlProblem } from "../problem/problem";
import inout from "../inout";
import * as path from "path";

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

export function RunFile(filePath: string): number {
    inout.setRootPath(filePath);

    const filename = path.basename(filePath);
    const content = inout.readFile(filename, "rootPath");
    if (content === null) {
        inout.print(`Cannot read file ${filePath}: file doesn't exist or can't be read`);
        inout.flush();
        return 1;
    }

    const result = RunLinker(content, filename);
    if (result === null) {
        return 1;
    }

    return 0;
}
