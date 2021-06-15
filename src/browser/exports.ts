import {NewPlFile, PlFile} from "../inout/file";
import PlLexer from "../compiler/lexing";
import {PlAstParser} from "../compiler/parsing";
import {ASTProgramHighlight, ASTProgramToColorRegions} from "../compiler/parsing/highlighter";
import {ReportProblems} from "../problem";
import {EmitProgram} from "../vm/emitter";
import {PlStackMachine} from "../vm/machine";
import inout, {PlInout} from "../inout";
import {IACTPrepare} from "../problem/interactive";
import {LogProblem, LogProblemShort} from "../problem/printer";

export function Highlight(text: string): any[] | null {
    const file = NewPlFile("highlighter", text);
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();

    const problems = parser.getProblems();
    if (problems.length != 0) {
        return null;
    }

    return ASTProgramToColorRegions(ast);
}

export function Execute(text: string, std: PlInout): number {
    const file = NewPlFile("execute", text);
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        const buffer = [];
        for (const p of problems) {
            buffer.push(LogProblemShort(p));
        }
        std.print(buffer.join("\n"));
        std.flush();
        return 1;
    }

    const program = EmitProgram(ast, true);
    const vm = new PlStackMachine({
        ...inout,
        ...std,
        print: message => {
            std.print(message);
            std.flush();
        }
    }, file, []);

    vm.addProgram(program);
    const out = vm.runProgram();
    if (out == null) {
        const problems = vm.getProblems();
        const buffer = [];
        for (const p of problems) {
            buffer.push(LogProblemShort(p));
        }
        std.print(buffer.join("\n"));
        std.flush();
        return 1;
    }
    std.flush();

    if (typeof out.value == "number")
        return out.value;
    return 0;
}
