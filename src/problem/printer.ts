import { PlProblem } from "./problem";
import { PCFullName, PCHint } from "./codes";
import inout from "../inout";

const NLINESUP = 1;
const NLINESDOWN = 2;

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

    for ( let i = 0; i < NLINESUP; ++i ) {
        linesUp.push( getLine( lines, targetRow - i - 1 ) );
    }

    for ( let i = 0; i < NLINESDOWN; ++i ) {
        linesDown.push( getLine( lines, targetRow + i + 1 ) );
    }

    return [
        linesUp,
        getLine( lines, targetRow ),
        linesDown,
    ];
}

export function LogProblem( problem: PlProblem, content: string ) {
    let buffer = [];

    const { code, fileInfo, message } = problem;
    const actualCol = fileInfo.col - fileInfo.length;
    const largestLineNumberLength = (fileInfo.row + NLINESDOWN).toString().length;

    // add header
    buffer.push( `[${code}] In "${fileInfo.filename}" at ${fileInfo.row + 1}:${actualCol + 1}` );

    // lines and stuff
    const contentLines = content.split( '\n' );
    const [ linesUp, targetLine, linesDown ] = getLines( contentLines, fileInfo.row );

    let startLine = fileInfo.row - NLINESUP + 1;
    // add all the lines above
    for ( const line of linesUp ) {
        if ( line !== null )
            buffer.push( `${startLine.toString().padStart(largestLineNumberLength)}| ${line}` );
        ++startLine;
    }
    // add current line and ^^ pointers
    buffer.push( `${startLine.toString().padStart(largestLineNumberLength)}| ${targetLine}` );
    ++startLine;
    buffer.push( ' ' .repeat(largestLineNumberLength) + '| ' + ' '.repeat( actualCol ) + '^'.repeat( fileInfo.length ) + ' here' );
    // add all the lines below
    for ( const line of linesDown ) {
        if ( line !== null )
            buffer.push( `${startLine.toString().padStart(largestLineNumberLength)}| ${line}` );
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
