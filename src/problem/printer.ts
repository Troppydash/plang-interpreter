import { PlProblem } from "./problem";
import { PCFullName, PCHint } from "./codes";
import inout from "../inout";

const nlinesUp = 1;
const nlinesDown = 2;

function getLine( lines: string[], targetRow: number ): string | null {
    if ( targetRow >= 0 && targetRow < lines.length ) {
        return lines[targetRow];
    }
    return null;
}

// find one line up, two lines down
function getLines( lines: string[], targetRow: number ): [ string[], string, string[] ] {
    let linesUp = [];
    let linesDown = [];

    for ( let i = 0; i < nlinesUp; ++i ) {
        linesUp.push( getLine( lines, targetRow - i - 1 ) );
    }

    for ( let i = 0; i < nlinesDown; ++i ) {
        linesDown.push( getLine( lines, targetRow + i + 1 ) );
    }

    return [
        linesUp,
        getLine( lines, targetRow ),
        linesDown,
    ];
}

export function LogProblem( problem: PlProblem, content: string ) {
    // todo: deal with larger line numbers
    let buffer = [ "Problem Occurred" ];

    const { code, fileInfo, message } = problem;
    const actualCol = fileInfo.col - fileInfo.length;

    // add header
    buffer.push( `[${code}] In "${fileInfo.filename}" at ${fileInfo.row + 1}:${actualCol + 1}` );

    // lines and stuff
    const contentLines = content.split( '\n' );
    const [ linesUp, targetLine, linesDown ] = getLines( contentLines, fileInfo.row );

    let startLine = fileInfo.row - nlinesUp + 1;
    for ( const line of linesUp ) {
        if ( line !== null )
            buffer.push( `${startLine}| ${line}` );
        ++startLine;
    }
    buffer.push( `${startLine}| ${targetLine}` );
    ++startLine;
    buffer.push( ' | ' + ' '.repeat( actualCol ) + '^'.repeat( fileInfo.length ) + ' here' );
    for ( const line of linesDown ) {
        if ( line !== null )
            buffer.push( `${startLine}| ${line}` );
        ++startLine;
    }
    buffer.push( '' );

    // hints
    buffer.push( `Hint: ${PCHint( code )}` );
    // error
    buffer.push( `${PCFullName( code )}: ${message}` );


    // print
    inout.print( buffer.join( '\n' ) );
}
