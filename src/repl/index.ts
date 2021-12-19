import { Inout, isNode } from "../inout";
import { RunOnce, TryRunParser} from "../linking";
import { LogProblemShort } from "../problem/printer";
import { colors } from "../inout/color";
import { PlConverter } from "../vm/machine/native/converter";
import {PlStackMachine} from "../vm/machine";
import { NewPlFile } from "../inout/file";
import {timestamp, version} from "../timestamp";
import PlLexer from "../compiler/lexing";
import {PlAstParser} from "../compiler/parsing";
import {EmitProgram} from "../vm/emitter";
import {ASTProgramToString} from "../compiler/parsing/visualizer";
import {PlProgramToString} from "../vm/emitter/printer";

export function GetLine(filename: string): string | null {
    let content = "";
    let firstPrompt = true;
    let linenum = 1;

    completer:
        while (true) {
            let out = firstPrompt ? `${filename}> ` : `${('' + linenum).padStart(filename.length, ' ')}| `;
            linenum += 1;

            const message = Inout().input(out);
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
                    Inout().print(`${LogProblemShort(outcome[0])}`);
                    const result = Inout().input(colors.magenta(`Undo line ${linenum - 1}? `) + `[${colors.green('y')}/n]: `);
                    if (result != 'n') {
                        linenum -= 1;
                        content = oldContent;
                        continue;
                    }
                }
            }
            break;
        }
    return content.slice(0, content.length-1); // strip \n
}

export function StartREPL( filename: string ): number {
    Inout().print( `Welcome to the Deviation interactive console` );
    Inout().print( `Built on ${timestamp} (version ${version})` );
    if ( isNode ) {
        const os = require( 'os' );
        Inout().print( `Running on ${os.platform()}-${os.arch()}. Hello ${os.hostname()}!` );
        Inout().print( `Press Ctrl+C to quit` );
    }

    let stream = false;
    const vm = new PlStackMachine({
        ...Inout(),
        input: message => {
            stream = true;
            return Inout().input(message)
        },
        print: message => {
            stream = true;
            Inout().print(message);
            Inout().flush()
        }
    }, NewPlFile('repl', ''));

    while (true) {
        stream = false;
        const line = GetLine(filename);
        if (line == null) {
            break;
        }

        const file = NewPlFile(filename, line);
        const result = RunOnce(vm, file);
        if (stream == false && result != null) {
            Inout().print(`${' '.repeat(filename.length)}> ${PlConverter.PlToString(result, vm)}`);
        }
        vm.rearm();
    }


    Inout().print("Input Terminated, Goodbye");
    Inout().flush();
    return 0;
}

export function StartDemo(filename: string): number {
    Inout().print( `Running Deviation in demo mode (version ${timestamp})` );
    if (isNode) {
        Inout().print("Press Ctrl-C to quit");
    }

    const vm = new PlStackMachine({
        ...Inout(),
        input: _ => {return ''},
        print: _ => {}
    }, NewPlFile('demo', ''));

    while (true) {
        const line = GetLine(filename);
        if (line == null) {
            break;
        }

        const file = NewPlFile(filename, line);

        // steps
        Inout().print("[Running] Lexing and Parsing...");

        const lexer = new PlLexer(file);
        const parser = new PlAstParser(lexer);
        const ast = parser.parseAll();
        if (ast == null) {
            Inout().print("[Error] Parser error found, try again?");
            continue;
        }
        Inout().print("[Display] Printing Parser output");
        Inout().print(ASTProgramToString(ast));
        Inout().print('');

        Inout().print("[Running] Emitting bytecodes...");
        const program = EmitProgram(ast);
        Inout().print("[Display] Printing bytecodes");
        Inout().print(PlProgramToString(program));
        Inout().print('');

        Inout().print("[Running] Executing Virtual Machine");
        program.program.pop();
        vm.addProgram(program, file.content);
        const result = vm.runProgram();
        if (result == null) {
            Inout().print("[Error] VM error found, try again?");
            vm.rearm();
            continue;
        }

        const out = vm.popStack();
        let str = "empty";
        if (out != null) {
            str = PlConverter.PlToString(out, vm);
        }

        Inout().print("[Display] Printing expression result");
        Inout().print(`${' '.repeat(filename.length)}> ${str}`);

        vm.rearm();
    }

    Inout().print("Input Terminated, demo stopped");
    Inout().flush();
    return 0;
}
