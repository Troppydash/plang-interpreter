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
    }

    outer:
        while ( true ) {
            let content = "";

            let first = true;

            completer:
            while ( true ) {
                let out = first ? `${filename}> ` : `${' '.repeat( filename.length )}: `;
                if (first)
                    first = false;

                const message = inout.input( out );
                if ( message === null ) {
                    inout.print( "Input terminated, goodbye" );
                    break outer;
                }
                content += message;

                if (message == '') {
                    break;
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

            // const nested: Record<string, number> = {
            //     '{': 0,
            //     ')': 0,
            // };
            //
            // while ( true ) {
            //     let out = objCount(nested) == 0 ? `${filename}> ` : `${' '.repeat( filename.length )}: `;
            //     const message = inout.input( out );
            //     if ( message === null ) {
            //         inout.print( "Input terminated, goodbye" );
            //         break outer;
            //     }
            //     if (message == '') {
            //         break;
            //     }
            //     content += `${message}\n`;
            //
            //     const striped = content.trimEnd();
            //     const last = striped[striped.length-1];
            //     if ( last == '{' || last == '(' ) {
            //         nested[last] += 1;
            //         continue;
            //     }
            //
            //     if ( last == '}' || last == ')' ) {
            //         const map = last == '}' ? '{' : '(';
            //         if (nested[map] > 0)
            //             nested[map] -= 1;
            //     }
            //
            //     if ( objCount(nested) <= 0 ) {
            //         break;
            //     }
            // }

            let tree = RunParser( content, filename );
            if ( tree != null ) {
                inout.print( AttemptPrettyPrint( tree ) );
            }
        }

    inout.flush();
    return 0;
}
