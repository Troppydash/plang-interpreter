import inout, { isNode } from "../inout";
import { RunParser, TryRunParser } from "../linking";
import { AttemptPrettyPrint } from "../compiler/parsing/visualizer";

function objCount(obj: Record<string, number>) {
    return Object.values(obj).reduce((prev, curr) => prev + curr);
}

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

            let first = true;

            completer:
            while ( true ) {
                let out = first ? `${filename}> ` : `${' '.repeat( filename.length )}: `;

                const message = inout.input( out );
                if ( message === null ) {
                    if (first) {
                        inout.print( "Input terminated, goodbye" );
                        break outer;
                    }
                    break;
                }

                content += message;
                if (first) {
                    first = false;
                }
                const outcome = TryRunParser(content, filename);
                content += '\n';

                if (outcome != null) {
                    for (const problem of outcome) {
                        if (problem.code.startsWith('CE')) {
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
