import inout, { isNode } from "../inout";
import { RunParser, TryRunParser } from "../linking";
import { AttemptPrettyPrint } from "../compiler/parsing/visualizer";
import { LogProblemShort } from "../problem/printer";
import { colors } from "../inout/color";

export function StartREPL( filename: string ): number {
    inout.print( "Welcome to the Plang Interactive console" );
    if ( isNode ) {
        const os = require( 'os' );
        inout.print( `Running on ${os.platform()}-${os.arch()}. Hello ${os.hostname()}!` );
        inout.print( `Press Ctrl+C to quit` );
    }

    outer:
        while ( true ) {
            let content = "";
            let firstPrompt = true;

            completer:
            while ( true ) {
                let out = firstPrompt ? `${filename}> ` : `${' '.repeat( filename.length )}: `;

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
                        const result = inout.input(colors.magenta('Continue? ') + '[y/n]: ');
                        if (result != 'y') {
                            content = oldContent;
                            continue completer;
                        }
                    }
                }
                break;
            }

            let tree = RunParser( content, filename );
            if ( tree != null ) {
                inout.print( AttemptPrettyPrint( tree ) );
            }
        }

    inout.flush();
    return 0;
}
