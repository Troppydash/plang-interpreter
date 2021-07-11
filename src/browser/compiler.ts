// used for easy compiles

import {RunVM} from "../linking/index.js";
import {NewPlFile} from "../inout/file.js";
import PlLexer from "../compiler/lexing/index.js";
import {PlAstParser} from "../compiler/parsing/index.js";
import {ReportProblems} from "../problem/index.js";
import {EmitProgram} from "../vm/emitter/index.js";
import inout, {PlInout} from "../inout/index.js";
import {LogProblem, LogTrace} from "../problem/printer.js";
import {PlStackMachine} from "../vm/machine/index.js";

interface Result {
    code: number;
    ok: boolean;
    trace: string[];
    problems: string[];
}

export function execute(text: string, options: PlInout): Result {
    const file = NewPlFile("browser", text);
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        return {
            code: 1,
            ok: false,
            trace: [],
            problems: problems.map(p => LogProblem(p, text))
        };
    }

    const program = EmitProgram(ast);
    const vm = new PlStackMachine({
        ...inout,
        ...options,
    }, file, []);
    vm.addProgram(program);

    const out = vm.runProgram();
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();

        return {
            code: 1,
            ok: false,
            trace: trace.map(t => LogTrace(t)),
            problems: problems.map(p => LogProblem(p, text))
        };
    }
    vm.inout.flush();

    let code = 0;
    if (typeof out.value == "number") {
        code = out.value;
    }
    return {
        code,
        ok: true,
        trace: [],
        problems: []
    };
}
