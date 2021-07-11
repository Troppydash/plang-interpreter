// used for easy compiles

import {NewPlFile} from "../inout/file";
import PlLexer from "../compiler/lexing";
import {PlAstParser} from "../compiler/parsing";
import {EmitProgram} from "../vm/emitter";
import inout, {PlInout} from "../inout/index";
import {LogProblem, LogTrace} from "../problem/printer";
import {PlStackMachine} from "../vm/machine";

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
