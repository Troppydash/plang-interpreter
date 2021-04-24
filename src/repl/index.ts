import inout, { isNode } from "../inout";
import { RunEmitter, RunParser, RunVM, TryRunParser } from "../linking";
import { AttemptPrettyPrint } from "../compiler/parsing/visualizer";
import { LogProblemShort } from "../problem/printer";
import { colors } from "../inout/color";

export function StartREPL( filename: string ): number {
    inout.print( "Welcome to the Plang interactive console" );
    if ( isNode ) {
        const os = require( 'os' );
        inout.print( `Running on ${os.platform()}-${os.arch()}. Hello ${os.hostname()}!` );
        inout.print( `Press ctrl+c to quit` );
    }

    outer:
        while ( true ) {
            let content = "";
            let firstPrompt = true;
            let linenum = 1;

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

                const outcome = TryRunParser(content, filename);
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
                        const result = inout.input(colors.magenta(`Undo line ${linenum-1}? `) + '[y/n]: ');
                        if (result != 'n') {
                            linenum -= 1;
                            content = oldContent;
                            continue completer;
                        }
                    }
                }
                break;
            }

            RunEmitter(content, filename);
        }

    inout.flush();
    return 0;
}
