import PlLexer from "../compiler/lexing";
import {ReportProblems} from "../problem";
import {NewPlFile, PlFile} from "../inout/file";
import inout from "../inout";
import {ASTProgram} from "../compiler/parsing/ast";
import {PlAstParser} from "../compiler/parsing";
import {PlProblem} from "../problem/problem";
import {EmitProgram, EmitStatement, PlProgram} from "../vm/emitter/";
import {PlStackMachine} from "../vm/machine";
import {IACTPrepare, IACTSync} from "../problem/interactive/index";
import {IACTTrace} from "../problem/interactive/trace";
import {ASTProgramHighlight, ASTProgramToColorRegions} from "../compiler/parsing/highlighter";


export function RunParser(file: PlFile): ASTProgram | null {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const result = parser.parseAll();

    const problems = parser.getProblems();
    if (problems.length != 0) {
        ReportProblems(file.content, problems);
        return null;
    }

    return result;
}

export function RunEmitter(file: PlFile): PlProgram | null {
    const ast = RunParser(file);
    if (ast == null) {
        return null;
    }

    return EmitProgram(ast, true);
}


export function TryRunParser(file: PlFile): PlProblem[] | null {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        return parser.getProblems();
    }
    return null;
}

export function RunHighlighter(file: PlFile) {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();

    const problems = parser.getProblems();
    if (problems.length != 0) {
        ReportProblems(file.content, problems);
        return;
    }

    const regions = ASTProgramToColorRegions(ast);
    const out = ASTProgramHighlight(regions, file.content);
    inout.print(out);
}

export function RunOnce(vm: PlStackMachine, file: PlFile) {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return null;
    }

    const program = EmitProgram(ast);
    program.program.pop(); // remove final stkpop
    // shift debug
    for (const debug of program.debug) {
        debug.endLine += vm.program.program.length;
    }

    vm.addProgram(program, file.content);
    const out = vm.runProgram();
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        ReportProblems(file.content, problems, trace);
        return null;
    }
    return vm.popStack();
}

export function RunFile(vm: PlStackMachine, file: PlFile) {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return null;
    }

    const program = EmitProgram(ast);
    for (const debug of program.debug) {
        debug.endLine += vm.program.program.length;
    }

    vm.addProgram(program, file.content);
    const out = vm.runProgram();
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        ReportProblems(file.content, problems, trace);
        return 1;
    }
    inout.flush();

    if (typeof out.value == "number")
        return out.value;
    return 0;
}

/**
 * This function does not have error handling
 * @param file
 * @param args
 * @constructor
 */
export function RunVmFast(file: PlFile, args: string[]): number {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);

    const vm = new PlStackMachine({
        ...inout,
        print: message => {
            inout.print(message);
            inout.flush();
        }
    }, file, args);

    let out = null;
    while (!parser.isEOF()) {
        const statement = parser.parseOnce();
        if (statement == null) {
            const problems = parser.getProblems();
            ReportProblems(file.content, problems);
            return 1;
        }

        // we don't need to worry about the final return because there are no debugger anyways
        vm.addProgram(EmitStatement(statement));
        out = vm.runProgram();
        if (out == null) {
            const trace = vm.getTrace();
            const problems = vm.getProblems();
            ReportProblems(file.content, problems, trace);

            return 1;
        }
    }
    if (typeof out.value == "number")
        return out.value;
    return 0;
}

export function RunVM(file: PlFile, args: string[]): number {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return 1;
    }

    const program = EmitProgram(ast, true);
    const vm = new PlStackMachine({
        ...inout,
        print: message => {
            inout.print(message);
            inout.flush();
        }
    }, file, args);

    vm.addProgram(program);
    const out = vm.runProgram();
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        const ok = ReportProblems(file.content, problems, trace);

        // fancy
        if (ok && inout.options["mode"] == "debug" && ok && trace.length > 2 && IACTPrepare()) {
            // IACTSync(IACTTrace(file.content, problems, trace));
        }

        return 1;
    }
    inout.flush();

    if (typeof out.value == "number")
        return out.value;
    return 0;
}

export function ReadFile(filePath: string): PlFile | null {
    const path = require('path');
    inout.setRootPath(filePath);

    const filename = path.basename(filePath);
    const content = inout.readFile(filename, "rootPath");
    if (content === null) {
        inout.print(`Cannot read file '${filePath}'`);
        inout.print(`Reason: file doesn't exist or can't be read`);
        inout.flush();
        return null;
    }
    return NewPlFile(filename, content);
}
