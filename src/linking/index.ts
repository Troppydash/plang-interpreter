import PlToken from "../compiler/lexing/token";
import PlLexer from "../compiler/lexing";
import {ReportProblem, ReportProblems} from "../problem";
import {NewPlFile} from "../inout/file";
import inout from "../inout";
import {ASTProgram} from "../compiler/parsing/ast";
import {PlAstParser} from "../compiler/parsing";
import {AttemptPrettyPrint} from "../compiler/parsing/visualizer";
import {PlProblem} from "../problem/problem";
import {EmitProgram, EmitStatement} from "../vm/emitter/";
import {ProgramWithDebugToString} from "../vm/emitter/pprinter";
import {PlStackMachine} from "../vm/machine";
import {PlConverter} from "../vm/machine/native/converter";
import {colors} from "../inout/color";
import {StartInteractive} from "../problem/interactive";
import {TRACE_MAX} from "../problem/printer";

export function RunLinker(content: string, filename: string): PlToken[] | null {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const result = lexer.parseAll();

    const problems = lexer.getProblems();
    if (problems.length != 0) {
        for (const problem of problems) {
            ReportProblem(problem, content);
        }
        return null;
    }

    return result;
}

export function TryRunParser(content: string, filename: string): PlProblem[] | null {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const parser = new PlAstParser(lexer);
    const result = parser.parseAll();

    const problems = parser.getProblems();
    if (result == null || problems.length != 0) {
        return problems;
    }

    return null;
}

export function RunParser(content: string, filename: string): ASTProgram | null {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const parser = new PlAstParser(lexer);
    const result = parser.parseAll();

    const problems = parser.getProblems();
    if (problems.length != 0) {
        ReportProblems(content, problems);
        return null;
    }

    return result;
}

export function RunEmitter(content: string, filename: string): null {
    const ast = RunParser(content, filename);
    if (ast == null) {
        return null;
    }

    const program = EmitProgram(ast);
    inout.print(ProgramWithDebugToString(program));
    inout.print(`Emitted ${program.program.length} instructions, with ${program.debug.length} debug messages`);
    // inout.print(ProgramToPlb(program.program));
}

export function RunOnce(vm: PlStackMachine, content: string, filename: string) {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(content, problems);
        return null;
    }

    const program = EmitProgram(ast);
    program.program.pop(); // remove final stkpop
    const out = vm.runProgram(program);
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        ReportProblems(content, problems, trace);
        return null;
    }
    return vm.popStack();
}

export async function RunVM(content: string, filename: string) {
    const lexer = new PlLexer(NewPlFile(filename, content));
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(content, problems);
        return null;
    }

    const program = EmitProgram(ast);
    const vm = new PlStackMachine({
        input: inout.input,
        output: message => {
            inout.print(message);
            inout.flush();
        }
    });

    const out = vm.runProgram(program);
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        const ok = ReportProblems(content, problems, trace);

        // fancy
        if (ok && trace.length > TRACE_MAX) {
            // const answer = inout.input(`${colors.magenta("Start the interactive frame viewer?")} [${colors.green('y')}/n]: `);
            // if (answer == 'n' || answer == null) {
            //     return null;
            // }
            await StartInteractive(content, problems, trace);
        }

        return null;
    }
    inout.flush();
    return out;
}

export async function RunFile(filePath: string): Promise<number> {
    const path = require('path');
    inout.setRootPath(filePath);

    const filename = path.basename(filePath);
    const content = inout.readFile(filename, "rootPath");
    if (content === null) {
        inout.print(`Cannot read file ${filePath}: file doesn't exist or can't be read`);
        inout.flush();
        return 1;
    }

    await RunVM(content, filename);
    return 0;
}
