import { NewBytecode, PlBytecode, PlBytecodeType, PlProgram } from "./bytecode";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTBreak,
    ASTCall,
    ASTClosure,
    ASTContinue,
    ASTCreate,
    ASTDict,
    ASTDot,
    ASTEach,
    ASTExport,
    ASTFor,
    ASTFunction,
    ASTIf,
    ASTImpl,
    ASTImport,
    ASTList,
    ASTLoop,
    ASTMatch,
    ASTNode,
    ASTNull,
    ASTNumber,
    ASTProgram,
    ASTReturn,
    ASTStatement,
    ASTString,
    ASTType,
    ASTUnary,
    ASTVariable,
    ASTWhile
} from "../../compiler/parsing/ast";
import { NewPlDebugSingle, NewPlDebugStretch, PlDebug, PlDebugProgram } from "./debug";
import { NewFakePlToken, PlTokenType } from "../../compiler/lexing/token";

export const METHOD_SEP = '@';
export const ARITY_SEP = '/';
export const LOOP_INDEX = 'i@';
export const EACH_ITER = 'iter@';
export const MATCH_VALUE = 'value@';

export type PlProgramWithDebug = { program: PlProgram, debug: PlDebugProgram };

export function EmitProgram( ast: ASTProgram ): PlProgramWithDebug {
    let programBuilder = new ProgramBuilder();
    for ( const statement of ast ) {
        programBuilder.addPWD( EmitStatement( statement ) );
    }
    return programBuilder.toProgram();
}

export function EmitStatement( statement: ASTStatement ): PlProgramWithDebug {
    return (new ProgramBuilder())
        .addPWD( traverseAST( statement ) )
        .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
        .toProgram();

}

class ProgramBuilder {
    code: PlBytecode[];
    debugs: PlDebug[];
    line: number;

    constructor() {
        this.code = [];
        this.debugs = [];
        this.line = 0;
    }

    addPWD( program: PlProgramWithDebug, debug?: PlDebug ) {
        this.code.push( ...program.program );
        program.debug.forEach( d => {
            d.endLine += this.line;
        } )
        this.debugs.push( ...program.debug );
        this.line += program.program.length;
        if ( debug ) {
            debug.endLine += this.line;
            this.debugs.push( debug );
        }
        return this;
    }

    addPWDStretch( program: PlProgramWithDebug, node: ASTNode ) {
        return this.addPWD( program, NewPlDebugStretch( node, this.code.length + program.program.length ) );
    }

    addBytecode( bc: PlBytecode, debug?: PlDebug ) {
        this.code.push( bc );
        this.line += 1;
        if ( debug ) {
            debug.endLine += this.line;
            this.debugs.push( debug );
        }
        return this;
    }

    addBytecodeSingle( bc: PlBytecode, node: ASTNode ) {
        return this.addBytecode( bc, NewPlDebugSingle( node ) );
    }


    addBytecodeStretch( bc: PlBytecode, node: ASTNode ) {
        return this.addBytecode( bc, NewPlDebugStretch( node, this.code.length + 1 ) );
    }

    addEmpty() {
        return this.addBytecode( NewBytecode( PlBytecodeType.DEFETY ) );
    }

    addStretch( node: ASTNode ) {
        let debug = NewPlDebugStretch( node, this.code.length );
        debug.endLine += this.line;
        this.debugs.push( debug );
        return this;
    }

    popDebug() {
        this.debugs.pop();
        return this;
    }

    toProgram(): PlProgramWithDebug {
        return { program: this.code, debug: this.debugs };
    }
}

function traverseAST( node: ASTNode ): PlProgramWithDebug {
    let programBuilder = new ProgramBuilder();
    if ( node instanceof ASTNumber ) {
        return programBuilder.addBytecode( makeNumber( node ) ).toProgram();
    } else if ( node instanceof ASTVariable ) {
        return programBuilder.addBytecodeSingle( makeEvalVariable( node ), node ).toProgram();
    } else if ( node instanceof ASTNull ) {
        return programBuilder.addBytecode( makeNull( node ) ).toProgram();
    } else if ( node instanceof ASTBoolean ) {
        return programBuilder.addBytecode( makeBool( node ) ).toProgram();
    } else if ( node instanceof ASTString ) {
        return programBuilder.addBytecode( makeString( node ) ).toProgram();
    } else if ( node instanceof ASTType ) {
        return programBuilder.addBytecode( makeType( node ) ).toProgram();
    } else if ( node instanceof ASTBreak ) {
        return programBuilder.addBytecodeSingle( NewBytecode( PlBytecodeType.DOBRAK ), node ).toProgram();
    } else if ( node instanceof ASTContinue ) {
        return programBuilder.addBytecodeSingle( NewBytecode( PlBytecodeType.DOCONT ), node ).toProgram();
    } else if ( node instanceof ASTList ) {
        for ( const item of node.values.reverse() ) {
            programBuilder.addPWD( traverseAST( item ) );
        }
        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, "" + node.values.length ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DEFLST ), node )
            .toProgram();
    } else if ( node instanceof ASTDict ) {
        for ( let i = node.keys.length - 1; i >= 0; --i ) {
            programBuilder.addPWD( traverseAST( node.values[i] ) );
            programBuilder.addPWD( traverseAST( node.keys[i] ) );
        }
        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, "" + node.keys.length ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DEFDIC ), node )
            .toProgram();
    } else if ( node instanceof ASTCreate ) {
        programBuilder.addPWD( traverseAST( node.value ) );
        if ( node.pre ) {
            programBuilder.addPWD( traverseAST( node.pre ) );
        } else {
            programBuilder.addEmpty();
        }
        programBuilder.addBytecode( makeVariable( node.variable ) );
        programBuilder.addBytecodeStretch( NewBytecode( PlBytecodeType.DOCRET ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTAssign ) {
        programBuilder.addPWD( traverseAST( node.value ) );
        if ( node.pre ) {
            programBuilder.addPWD( traverseAST( node.pre ) );
        } else {
            programBuilder.addEmpty();
        }
        programBuilder.addBytecode( makeVariable( node.variable ) );
        programBuilder.addBytecodeStretch( NewBytecode( PlBytecodeType.DOASGN ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTDot ) {
        return programBuilder
            .addPWD( traverseAST( node.left ) )
            .addBytecode( makeVariable( node.right ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DOFIND ), node )
            .toProgram();
    } else if ( node instanceof ASTBinary ) {
        if ( node.operator.type == PlTokenType.AND ) {
            let right = traverseAST( node.right );
            return programBuilder
                .addPWD( traverseAST( node.left ) )
                .addBytecode( NewBytecode( PlBytecodeType.JMPIFF, '' + (right.program.length + 1) ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
                .addPWDStretch( right, node )
                .toProgram();
        } else if ( node.operator.type == PlTokenType.OR ) {
            let right = traverseAST( node.right );
            return programBuilder
                .addPWD( traverseAST( node.left ) )
                .addBytecode( NewBytecode( PlBytecodeType.JMPIFT, '' + (right.program.length + 1) ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
                .addPWDStretch( right, node )
                .toProgram();
        }

        return programBuilder
            .addPWD( traverseAST( node.right ) )
            .addPWD( traverseAST( node.left ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '2' ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFVAR, node.operator.content ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DOCALL ), node )
            .toProgram();
    } else if ( node instanceof ASTUnary ) {
        if ( node.operator.type == PlTokenType.INC ) {
            return programBuilder
                .addBytecode( makeVariable( node.value as ASTVariable ) )
                .addBytecodeStretch( NewBytecode( PlBytecodeType.DOOINC ), node )
                .toProgram();
        } else if ( node.operator.type == PlTokenType.DEC ) {
            return programBuilder
                .addBytecode( makeVariable( node.value as ASTVariable ) )
                .addBytecodeStretch( NewBytecode( PlBytecodeType.DOODEC ), node )
                .toProgram();
        }
        return programBuilder
            .addPWD( traverseAST( node.value ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '1' ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFVAR, node.operator.content ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DOCALL ), node )
            .toProgram();
    } else if ( node instanceof ASTReturn ) {
        if ( node.content ) {
            programBuilder.addPWD( traverseAST( node.content ) );
        } else {
            programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) );
        }
        return programBuilder.addBytecode( NewBytecode( PlBytecodeType.DORETN ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTFunction ) {
        programBuilder.addPWD( makeBlock( node.block ) );
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFFUN ) );
        programBuilder.addEmpty();
        const value = `${node.name.content}${ARITY_SEP}${node.args.length}`;
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFSTR, value ) );
        programBuilder.addBytecodeStretch( NewBytecode( PlBytecodeType.DOASGN ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTClosure ) {
        programBuilder.addPWD( makeBlock( node.block ) );
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        programBuilder.addBytecodeStretch( NewBytecode( PlBytecodeType.DEFFUN ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTImpl ) {
        programBuilder.addPWD( makeBlock( node.block ) );
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFFUN ) );
        programBuilder.addEmpty();
        const value = `${node.target.content}${node.name.content.startsWith( METHOD_SEP ) ? '' : METHOD_SEP}${node.name.content}${ARITY_SEP}${node.args.length}`;
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFSTR, value ) );
        programBuilder.addBytecodeStretch( NewBytecode( PlBytecodeType.DOASGN ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTCall ) {
        for ( const arg of node.args ) {
            programBuilder.addPWD( traverseAST( arg ) );
        }
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) )
            .addPWD( traverseAST( node.target ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DOCALL ), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTBlock ) {
        return programBuilder
            .addPWD( makeEvalBlock( node ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTIf ) {
        // surround whole thing with block
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.BLOENT ) );

        for ( let i = 0; i < node.conditions.length; ++i ) {
            let condition = traverseAST( node.conditions[i] );
            let block = makePureBlock( node.blocks[i] );

            // emit continuous jumps for success conditions
            if ( i != 0 ) {
                programBuilder
                    .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '' + (condition.program.length + 1 + block.program.length) ) );
            }

            let length = block.program.length + 1; // skip the jmprel in the next condition or 'else'
            if ( node.conditions.length - i == 1 && !node.other ) {
                length -= 1; // don't skip the jmprel if there is no next condition or 'else'
            }

            programBuilder
                .addPWD( condition )
                .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + length ) )
                .addPWD( block );
        }
        if ( node.other ) {
            let other = makePureBlock( node.other );
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '' + other.program.length ) )
                .addPWD( other );
        }

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTFor ) {
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.BLOENT ) );

        if ( node.start ) {
            programBuilder
                .addPWD( traverseAST( node.start ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );
        }

        let cond;
        let after;
        let condLength = 2;
        let afterLength = 0;

        if ( node.condition ) {
            cond = traverseAST( node.condition );
            condLength = cond.program.length + 1;
        }
        if ( node.after ) {
            after = traverseAST( node.after );
            afterLength = after.program.length + 1;
        }
        let block = makePureBlock( node.block );

        // replace break and continue
        for ( let i = 0; i < block.program.length; ++i ) {
            let bc = block.program[i];
            if ( bc.type == PlBytecodeType.DOBRAK ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i + afterLength) );
            } else if ( bc.type == PlBytecodeType.DOCONT ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i - 1) );
            }
        }

        // emit condition
        if ( cond ) {
            programBuilder
                .addPWD( cond );
        } else {
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.DEFBOL, '1' ) );
        }

        // emit block
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + afterLength + 1) ) )
            .addPWD( block );

        // emit after
        if ( after ) {
            programBuilder
                .addPWD( after )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );

        }

        // TODO: There might be some optimization here to ignore some instructions - skip the condition if it is empty
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (block.program.length + afterLength + condLength - 1) ) );

        // initial
        // condition
        // jmpicf
        // block
        // after
        // jmprel -

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTWhile ) {
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.BLOENT ) )

        let cond = traverseAST( node.condition );
        let block = makePureBlock( node.block );

        // replace breaks and continues
        for ( let i = 0; i < block.program.length; ++i ) {
            if ( block.program[i].type == PlBytecodeType.DOBRAK ) {
                // replace with jump
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i) );
            } else if ( block.program[i].type == PlBytecodeType.DOCONT ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i - 1) );
            }
        }
        programBuilder
            .addPWD( cond )
            .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + 1) ) )
            .addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (cond.program.length + block.program.length) ) );

        return programBuilder.addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTLoop ) {
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.BLOENT ) );

        let block = makePureBlock( node.block );
        let bodySize = block.program.length;

        // emit counter variable and compare
        if ( node.amount ) {
            const target = node.amount.getSpanToken();
            const assignment = new ASTCreate( [], undefined,
                new ASTVariable( [], LOOP_INDEX ),
                node.amount );

            programBuilder
                .addPWD( traverseAST( assignment ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );

            // i@ = n
            // while i@-- >= 0 {
            // }
            const cond = new ASTBinary( [],
                new ASTUnary( [ target ], NewFakePlToken( PlTokenType.DEC, "--" ), new ASTVariable( [], LOOP_INDEX ) ),
                new ASTNumber( [], 0 ),
                NewFakePlToken( PlTokenType.GTE, ">=" ) );

            programBuilder
                .addPWD( traverseAST( cond ) )
                .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (bodySize + 1) ) );
            bodySize += 7;
        }

        for ( let i = 0; i < block.program.length; ++i ) {
            let bc = block.program[i];
            if ( bc.type == PlBytecodeType.DOBRAK ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i) );
            } else if ( bc.type == PlBytecodeType.DOCONT ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i - 1) );
            }
        }

        programBuilder.addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (bodySize - 1) ) );

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTMatch ) {
        let value = null;
        if ( node.value ) {
            value = new ASTVariable( [], MATCH_VALUE );
            const assignment = new ASTAssign( [], undefined, value, node.value );
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.BLOENT ) )
                .addPWD( traverseAST( assignment ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );
        }

        // get conditions
        let conditions = [];
        for ( const branch of node.cases ) {
            let cases = null;
            for ( const kase of branch ) {
                const compare = value == null
                    ? kase
                    : new ASTBinary( [], value, kase, NewFakePlToken( PlTokenType.EQ, '==' ) );
                if ( cases == null ) {
                    cases = compare;
                } else {
                    cases = new ASTBinary( [], cases, compare, NewFakePlToken( PlTokenType.OR, 'or' ) );
                }
            }
            conditions.push( cases );
        }

        const astIf = new ASTIf( [], conditions, node.blocks, node.other );
        const ifProgram = traverseAST( astIf );
        if ( value ) { // get rid of the initial block enter bytecode
            ifProgram.program.shift();
            ifProgram.debug.forEach( d => d.endLine -= 1 );
        }

        return programBuilder
            .addPWD( ifProgram )
            .popDebug() // remove the if debug token
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTEach ) {
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.BLOENT ) );

        // iter@ = target.iter()
        // while @i = iter@.next() {
        //  KEY = i@.get(1)
        //  VALUE = i@.get(2)
        //  BLOCK
        // }

        const iter = new ASTVariable( [], EACH_ITER );
        const index = new ASTVariable( [], LOOP_INDEX );

        const target = node.iterator.getSpanToken();

        const assignment = new ASTCreate( [], undefined,
            iter,
            new ASTCall( [ target ], new ASTDot( [], node.iterator, new ASTVariable( [], "iter" ) ), [] )
        );
        programBuilder
            .addPWD( traverseAST( assignment ) )
            .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );


        const condition = new ASTCreate( [], undefined,
            index,
            new ASTCall( [ target ], new ASTDot( [], iter, new ASTVariable( [], "next" ) ), [] )
        );

        let inBlock = [];
        const valueAssign = new ASTCreate( [], undefined, node.value,
            new ASTCall( [ target ], new ASTDot( [], index, new ASTVariable( [], "get" ) ), [ new ASTNumber( [], 1 ) ] ) );
        inBlock.push( valueAssign );
        if ( node.key ) {
            const keyAssign = new ASTCreate( [], undefined, node.key,
                new ASTCall( [ target ], new ASTDot( [], index, new ASTVariable( [], "get" ) ), [ new ASTNumber( [], 2 ) ] ) );
            inBlock.push( keyAssign );
        }

        const cond = traverseAST( condition );
        const kvBlock = makePureBlock( new ASTBlock( [], inBlock ) );
        const block = makePureBlock( node.block );

        // replace breaks and continues
        for ( let i = 0; i < block.program.length; ++i ) {
            if ( block.program[i].type == PlBytecodeType.DOBRAK ) {
                // replace with jump
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i) );
            } else if ( block.program[i].type == PlBytecodeType.DOCONT ) {
                block.program[i] = NewBytecode( PlBytecodeType.JMPREL, '' + (block.program.length - i - 1) );
            }
        }

        return programBuilder
            .addPWD( cond )
            .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + kvBlock.program.length + 1) ) )
            .addPWD( kvBlock )
            .addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (cond.program.length + block.program.length + kvBlock.program.length) ) )
            .addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();

    } else if ( node instanceof ASTImport ) {
        // leave this later
    } else if ( node instanceof ASTExport ) {
        // leave this later
    }

    console.log( "DEBUG WARNING!" );
    return programBuilder
        .addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) )
        .addBytecode( NewBytecode( PlBytecodeType.DORETN ) ).toProgram();
}

function makeNumber( node: ASTNumber ) {
    return NewBytecode( PlBytecodeType.DEFNUM, '' + node.value );
}

function makeEvalVariable( node: ASTVariable ) {
    return NewBytecode( PlBytecodeType.DEFVAR, node.content );
}

function makeVariable( node: ASTVariable ) {
    return NewBytecode( PlBytecodeType.DEFSTR, node.content );
}

function makeNull( node: ASTNull ) {
    return NewBytecode( PlBytecodeType.DEFNUL, null );
}

function makeBool( node: ASTBoolean ) {
    return NewBytecode( PlBytecodeType.DEFBOL, "" + +node.value );
}

function makeString( node: ASTString ) {
    return NewBytecode( PlBytecodeType.DEFSTR, `${node.content}` );
}

function makeType( node: ASTType ) {
    return NewBytecode( PlBytecodeType.DEFTYP, `${node.content}` );
}

function makeBlock( node: ASTBlock ): PlProgramWithDebug {
    let statements = EmitProgram( node.statements );
    return (new ProgramBuilder())
        .addBytecode( NewBytecode( PlBytecodeType.BLOCRT, '' + statements.program.length ) )
        .addPWDStretch( statements, node )
        .toProgram();
}

function makeEvalBlock( node: ASTBlock ): PlProgramWithDebug {
    return (new ProgramBuilder())
        .addBytecode( NewBytecode( PlBytecodeType.BLOENT ) )
        .addPWD( EmitProgram( node.statements, ) )
        .addBytecode( NewBytecode( PlBytecodeType.BLOEXT ) )
        .toProgram();
}

function makePureBlock( node: ASTBlock ): PlProgramWithDebug {
    return (new ProgramBuilder())
        .addPWD( EmitProgram( node.statements ) )
        .toProgram();
}
