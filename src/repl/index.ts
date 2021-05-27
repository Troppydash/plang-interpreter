import inout, { isNode } from "../inout";
import { RunOnce, TryRunParser} from "../linking";
import { LogProblemShort } from "../problem/printer";
import { colors } from "../inout/color";
import { PlConverter } from "../vm/machine/native/converter";
import {PlStackMachine} from "../vm/machine";
import { NewPlFile } from "../inout/file";
import { timestamp } from "../timestamp";
import PlLexer from "../compiler/lexing";
import {PlAstParser} from "../compiler/parsing";
import {EmitProgram} from "../vm/emitter";
import {PrettyPrintAST} from "../compiler/parsing/visualizer";
import { PrettyPrintProgram } from "../vm/emitter/printer";

export function GetLine(filename: string): string | null {
    let content = "";
    let firstPrompt = true;
    let linenum = 1;

    completer:
        while (true) {
            let out = firstPrompt ? `${filename}> ` : `${('' + linenum).padStart(filename.length, ' ')}| `;
            linenum += 1;

            const message = inout.input(out);
            if (message === null) {
                if (firstPrompt) {
                    return null;
                }
                break;
            }

            let oldContent = content;
            content += message;

            const file = NewPlFile(filename, content);
            const outcome = TryRunParser(file);
            content += '\n';

            let oldFirstPrompt = firstPrompt;
            if (firstPrompt) {
                firstPrompt = false;
            }

            if (outcome != null) {
                for (const problem of outcome) {
                    if (problem.code.startsWith('CE')) {
                        continue completer;
                    }
                }
                if (!oldFirstPrompt) {
                    inout.print(`${LogProblemShort(outcome[0])}`);
                    const result = inout.input(colors.magenta(`Undo line ${linenum - 1}? `) + `[${colors.green('y')}/n]: `);
                    if (result != 'n') {
                        linenum -= 1;
                        content = oldContent;
                        continue;
                    }
                }
            }
            break;
        }
    return content;
}

export function StartREPL( filename: string ): number {
    inout.print( `Welcome to the Deviation interactive console (version ${timestamp})` );
    if ( isNode ) {
        const os = require( 'os' );
        inout.print( `Running on ${os.platform()}-${os.arch()}. Hello ${os.hostname()}!` );
        inout.print( `Press ctrl+c to quit` );
    }

    let stream = false;
    const vm = new PlStackMachine({
        ...inout,
        input: message => {
            stream = true;
            return inout.input(message)
        },
        print: message => {
            stream = true;
            inout.print(message);
            inout.flush()
        }
    });

    while (true) {
        stream = false;
        const line = GetLine(filename);
        if (line == null) {
            break;
        }

        const file = NewPlFile(filename, line);
        const result = RunOnce(vm, file);
        if (stream == false && result != null) {
            inout.print(`${' '.repeat(filename.length)}> ${PlConverter.PlToString(result, vm)}`);
        }
        vm.rearm();
    }


    inout.print("Input Terminated, Goodbye");
    inout.flush();
    return 0;
}

export function StartDemo(filename: string): number {
    inout.print( `Running Deviation in demo mode (version ${timestamp})` );
    if (isNode) {
        inout.print("Press ctrl-c to quit");
    }

    const vm = new PlStackMachine({
        ...inout,
        input: _ => {return ''},
        print: _ => {}
    });

    while (true) {
        const line = GetLine(filename);
        if (line == null) {
            break;
        }

        const file = NewPlFile(filename, line);

        // steps
        inout.print("[Running] Lexing and Parsing...");

        const lexer = new PlLexer(file);
        const parser = new PlAstParser(lexer);
        const ast = parser.parseAll();
        if (ast == null) {
            inout.print("[Error] Parser error found, try again?");
            continue;
        }
        inout.print("[Display] Printing Parser output");
        inout.print(PrettyPrintAST(ast));
        inout.print('');

        inout.print("[Running] Emitting bytecodes...");
        const program = EmitProgram(ast);
        inout.print("[Display] Printing bytecodes");
        inout.print(PrettyPrintProgram(program));
        inout.print('');

        inout.print("[Running] Executing Virtual Machine");
        program.program.pop();
        vm.addProgram(program);
        const result = vm.runProgram();
        if (result == null) {
            inout.print("[Error] VM error found, try again?");
            vm.rearm();
            continue;
        }

        const out = vm.popStack();
        let str = "empty";
        if (out != null) {
            str = PlConverter.PlToString(out, vm);
        }

        inout.print("[Display] Printing expression result");
        inout.print(`${' '.repeat(filename.length)}> ${str}`);

        vm.rearm();
    }

    inout.print("Input Terminated, demo stopped");
    inout.flush();
    return 0;
}
