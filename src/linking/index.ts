import PlToken, { PlTokenToString } from "../compiler/lexing/token";
import PlLexer from "../compiler/lexing";
import { ReportProblem, ReportProblems } from "../problem";
import { NewPlFile } from "../inout/file";
import inout from "../inout";
import { ASTProgram, ASTStatement } from "../compiler/parsing/ast";
import { PlAstParser } from "../compiler/parsing";
import { AttemptPrettyPrint } from "../compiler/parsing/visualizer";
import { PlProblem } from "../problem/problem";

export function RunLinker( content: string, filename: string ): PlToken[] | null {
    const lexer = new PlLexer( NewPlFile( filename, content ) );
    const result = lexer.parseAll();

    const problems = lexer.getProblems();
    if ( problems.length != 0 ) {
        for ( const problem of problems ) {
            ReportProblem( problem, content );
        }
        return null;
    }

    return result;
}

export function TryRunParser(content: string, filename: string): PlProblem[] | null {
    const lexer = new PlLexer( NewPlFile( filename, content ) );
    const parser = new PlAstParser( lexer );
    const result = parser.parseAll();

    const problems = parser.getProblems();
    if ( result == null || problems.length != 0 ) {
        return problems;
    }

    return null;
}

export function RunParser( content: string, filename: string ): ASTProgram | null {
    const lexer = new PlLexer( NewPlFile( filename, content ) );
    const parser = new PlAstParser( lexer );
    const result = parser.parseAll();

    const problems = parser.getProblems();
    if ( result == null || problems.length != 0 ) {
        ReportProblems( problems, content );
        return null;
    }

    return result;
}

export function RunFile( filePath: string ): number {
    const path = require( 'path' );
    inout.setRootPath( filePath );

    const filename = path.basename( filePath );
    const content = inout.readFile( filename, "rootPath" );
    if ( content === null ) {
        inout.print( `Cannot read file ${filePath}: file doesn't exist or can't be read` );
        inout.flush();
        return 1;
    }

    const result = RunParser( content, filename );
    if ( result == null ) {
        return 1;
    }

    inout.print( AttemptPrettyPrint( result ) );

    // console.log(result);
    inout.flush();
    return 0;
}
