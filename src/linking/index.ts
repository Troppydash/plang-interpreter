import PlLexer from "../compiler/lexing";
import {ReportProblems} from "../problem";
import {NewPlFile, PlFile} from "../inout/file";
import  {Inout, isNode} from "../inout";
import {ASTProgram} from "../compiler/parsing/ast";
import {PlAstParser} from "../compiler/parsing";
import {PlProblem} from "../problem/problem";
import {EmitProgram, EmitStatement, PlProgram} from "../vm/emitter/";
import {PlStackMachine} from "../vm/machine";
import {ASTProgramHighlight, ASTProgramToColorRegions} from "../compiler/parsing/highlighter";
import {OptimizeProgram} from "../vm/optimizer";


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
    let ast = RunParser(file);
    if (ast == null) {
        return null;
    }

    ast = OptimizeProgram(ast);
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

export function HighlightProgram(text: string): string {
    const file = NewPlFile("highlighter", text);
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    const ast = parser.parseAll();

    if (parser.getProblems().length !== 0) {
        return text;
    }

    const regions = ASTProgramToColorRegions(ast);
    const out =  ASTProgramHighlight(regions, file.content);
    // remove last \n
    return out.slice(0, out.length-1);
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
    Inout().print(out);
}

export function RunOnce(vm: PlStackMachine, file: PlFile) {
    const lexer = new PlLexer(file);
    const parser = new PlAstParser(lexer);
    let ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return null;
    }
    ast = OptimizeProgram(ast);

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
    let ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return null;
    }
    ast = OptimizeProgram(ast);

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
    Inout().flush();

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
        ...Inout(),
        print: message => {
            Inout().print(message);
            Inout().flush();
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
    let ast = parser.parseAll();
    if (ast == null) {
        const problems = parser.getProblems();
        ReportProblems(file.content, problems);
        return 1;
    }

    ast = OptimizeProgram(ast);
    const program = EmitProgram(ast, true);
    const vm = new PlStackMachine({
        ...Inout(),
        print: message => {
            Inout().print(message);
            Inout().flush();
        }
    }, file, args);

    vm.addProgram(program);
    const out = vm.runProgram();
    if (out == null) {
        const trace = vm.getTrace();
        const problems = vm.getProblems();
        const ok = ReportProblems(file.content, problems, trace);

        // fancy
        // if (ok && Inout().options["mode"] == "debug" && ok && trace.length > 2 && IACTPrepare()) {
        // IACTSync(IACTTrace(file.content, problems, trace));
        // }

        return 1;
    }
    Inout().flush();

    if (typeof out.value == "number")
        return out.value;
    return 0;
}

export function ReadFile(filePath: string): PlFile | null {
    const path = require('path');
    Inout().setRootPath(filePath);

    const filename = path.basename(filePath);
    let content;
    if (path.isAbsolute(filePath)) {
        try {
            content = require('fs').readFileSync(filePath).toString();
        } catch (e) {
            content = null
        }
    } else {
        content = Inout().readFile(filename, "rootPath");
    }
    if (content === null) {
        Inout().print(`Cannot read file '${filePath}'`);
        Inout().print(`Reason: file doesn't exist or can't be read`);
        Inout().flush();
        return null;
    }
    return NewPlFile(filename, content);
}
