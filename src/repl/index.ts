import inout, { isNode } from "../inout";
import { RunOnce, TryRunParser} from "../linking";
import { LogProblemShort } from "../problem/printer";
import { colors } from "../inout/color";
import {PlActions} from "../vm/machine/native/converter";
import {PlStackMachine} from "../vm/machine";
import { NewPlFile } from "../inout/file";
import { timestamp } from "../timestamp";

export function StartREPL( filename: string ): number {
    inout.print( `Welcome to the Plang interactive console (version ${timestamp})` );
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

    outer:
        while ( true ) {
            let content = "";
            let firstPrompt = true;
            let linenum = 1;

            stream = false;

            completer:
            while ( true ) {
                let out = firstPrompt ? `${filename}> ` : `${(''+linenum).padStart( filename.length, ' ')}| `;
                linenum += 1;

                const message = inout.input( out );
                if ( message === null ) {
                    if (firstPrompt) {
                        inout.print( "Input terminated, goodbye" );
                        break outer;
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
                        const result = inout.input(colors.magenta(`Undo line ${linenum-1}? `) + `[${colors.green('y')}/n]: `);
                        if (result != 'n') {
                            linenum -= 1;
                            content = oldContent;
                            continue completer;
                        }
                    }
                }
                break;
            }

            // RunEmitter(content, filename);
            const file = NewPlFile(filename, content);
            const result = RunOnce(vm, file);
            if (stream == false && result != null) {
                inout.print(`${' '.repeat(filename.length)}> ${PlActions.PlToString(result)}`);
            }
            vm.rearm();
        }

    inout.flush();
    return 0;
}
