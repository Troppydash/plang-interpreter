import PlToken from "../compiler/lexing/token";
import PlLexer from "../compiler/lexing";
import { ReportProblem, ReportProblems } from "../problem";
import { NewPlFile } from "../inout/file";
import inout from "../inout";
import { ASTProgram } from "../compiler/parsing/ast";
import { PlAstParser } from "../compiler/parsing";
import { AttemptPrettyPrint } from "../compiler/parsing/visualizer";
import { PlProblem } from "../problem/problem";
import { EmitProgram, EmitStatement } from "../vm/emitter/";
import {ProgramWithDebugToString} from "../vm/emitter/pprinter";
import { PlStackMachine } from "../vm/machine";

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
    if ( problems.length != 0 ) {
        ReportProblems( problems, content );
        return null;
    }

    return result;
}

export function RunVM(content: string, filename: string) {
    const lexer = new PlLexer( NewPlFile( filename, content ) );
    const parser = new PlAstParser( lexer );
    const vm = new PlStackMachine({
        input: inout.input,
        output: inout.print
    });

    while ( true ) {
        // exit if finished
        if (parser.isEOF()) {
            break;
        }

        // parse a statement
        const statement = parser.parseOnce();
        if ( statement == null ) {
            break;
        }

        // exit if error
        const problems = parser.getProblems();
        if ( problems.length != 0 ) {
            ReportProblems( problems, content );
            break;
        }

        // emit bytecode
        const out = EmitStatement(statement); // this will never fail

        // run the bytecode
        vm.runProgram(out.program, out.debug);

        // exit if error
    }
}

export function RunEmitter(content: string, filename: string): null {
    const ast = RunParser(content, filename);
    if (ast == null) {
        return null;
    }

    const program = EmitProgram(ast);
    inout.print(ProgramWithDebugToString(program));
    inout.print(`Emitted ${program.program.length} instructions, with ${program.debug.length} debug messages`);
    // inout.print(ProgramToPlb(program.program));
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

    // const result = RunParser( content, filename );
    // if ( result == null ) {
    //     return 1;
    // }
    //


    // inout.print( AttemptPrettyPrint( result ) );
    // RunEmitter(content, filename);
    RunVM(content, filename);

    // console.log(result);
    inout.flush();
    return 0;
}
