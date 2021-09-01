// used for easy compiles

import {NewPlFile} from "../inout/file";
import PlLexer from "../compiler/lexing";
import {PlAstParser} from "../compiler/parsing";
import {EmitProgram} from "../vm/emitter";
import inout, {PlInout} from "../inout/index";
import {LogProblem, LogProblemShort, LogTrace} from "../problem/printer";
import {PlStackMachine} from "../vm/machine";
import {colors, SetColorNone} from "../inout/color";

interface Result {
    code: number;
    ok: boolean;
    trace: string[];
    problems: string[];
}

export function execute(text: string, options: PlInout): Result {
    SetColorNone();

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
            problems: problems.map(p => LogProblemShort(p))
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
            trace: LogTrace(trace).split('\n'),
            problems: problems.map(p => LogProblemShort(p))
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
