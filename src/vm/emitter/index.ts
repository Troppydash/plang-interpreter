import {NewBytecode, PlBytecode, PlBytecodeType} from "./bytecode";
import {
    ASTAssign,
    ASTAttributes,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTBreak,
    ASTCall,
    ASTClosure,
    ASTContinue,
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
    ASTWhile, ASTAssignType
} from "../../compiler/parsing/ast";
import {NewPlDebugSingle, NewPlDebugStretch, PlDebug, PlDebugProgram} from "./debug";
import {NewFakePlToken, PlTokenType} from "../../compiler/lexing/token";
import {Inout} from "../../inout";

export const METHOD_SEP = '.';
export const LOOP_INDEX = '|i|';
export const EACH_ITER = '|iter|';
export const MATCH_VALUE = '|value|';

export const DEFAULT_SET_BC = PlBytecodeType.DOASNL;  // local
export const DEFAULT_SET_AST = ASTAssignType.LOCAL;  // local

export type PlProgram = { program: PlBytecode[], debug: PlDebugProgram };

// this addReturn should be false by default, but I am now too lazy to hunt it down
export function EmitProgram( ast: ASTProgram, addReturn: boolean = false ): PlProgram {
    let programBuilder = new ProgramBuilder();
    for ( const statement of ast ) {
        programBuilder.addPWD( EmitStatement( statement ) );
    }
    const program = programBuilder.toProgram();
    if (addReturn && (program.program.length == 0 || program.program[program.program.length-1].type != PlBytecodeType.DORETN)) {
        program.program.push(makeNull(), NewBytecode(PlBytecodeType.DORETN));
    }
    return program;
}

export function EmitStatement( statement: ASTStatement ): PlProgram {
    return (new ProgramBuilder())
        .addPWD( traverseAST( statement ) )
        .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
        .toProgram();
}

class ProgramBuilder {
    code: PlBytecode[];
    debugs: PlDebug[];
    line: number;

    emitDebug: boolean;

    constructor() {
        this.emitDebug = Inout().options['mode'] == 'debug';
        this.code = [];
        this.debugs = [];
        this.line = 0;
    }

    addPWDNoDebug( program: PlProgram ) {
        this.code.push( ...program.program );
        this.line += program.program.length;
        return this;
    }

    addPWD( program: PlProgram, debug?: PlDebug ) {
        this.code.push( ...program.program );
        if (this.emitDebug) {
            program.debug.forEach( d => {
                d.endLine += this.line;
            } )
            this.debugs.push( ...program.debug );
        }
        this.line += program.program.length;
        if ( this.emitDebug && debug ) {
            debug.endLine += this.line;
            this.debugs.push( debug );
        }
        return this;
    }

    addPWDStretch( program: PlProgram, node: ASTNode, length: number | null = null ) {
        return this.addPWD( program, NewPlDebugStretch( node, length == null ? this.code.length + program.program.length : length ) );
    }

    addBytecode( bc: PlBytecode, debug?: PlDebug ) {
        this.code.push( bc );
        this.line += 1;
        if ( this.emitDebug && debug ) {
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

    addStretch( node: ASTNode, length: number | null = null ) {
        if (!this.emitDebug) return this;
        let debug = NewPlDebugStretch( node, length == null ? this.code.length : length );
        debug.endLine += this.line;
        this.debugs.push( debug );
        return this;
    }

    popDebug() {
        if (!this.emitDebug) return this;
        this.debugs.pop();
        return this;
    }

    toProgram(): PlProgram {
        return { program: this.code, debug: this.debugs };
    }
}

/**
 * Replaces the breaks and continues of in the block, assuming the block ends with a jmprel
 * This is use to generate continues and jump in loops, it directly modifies the block
 * @param block The block that have its program replaces
 * @param extra
 */
function replaceBC(block: PlProgram, extra: number) {
    let surround = 0;
    const length =  block.program.length;
    for ( let i = 0; i < length; ++i ) {
        const byte = block.program[i];
        switch (byte.type) {
            case PlBytecodeType.DOBRAK: {
                if (byte.value == null)
                    block.program[i] = NewBytecode( PlBytecodeType.DOBRAK, `${(length + extra - i)},${surround}` );
                break;
            }
            case PlBytecodeType.DOCONT: {
                if (byte.value == null)
                    block.program[i] = NewBytecode( PlBytecodeType.DOCONT, `${(length + extra - i - 1)},${surround}` );
                break;
            }
            case PlBytecodeType.STKENT:
                surround += 1;
                break;
            case PlBytecodeType.STKEXT:
                surround -= 1;
                break;
        }
    }
}

function traverseAST( node: ASTNode ): PlProgram {
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
            const key = node.keys[i];
            let value;
            if ( key instanceof ASTVariable ) {
                value = key.content;
            } else if ( key instanceof ASTString ) {
                value = key.content;
            } else if ( key instanceof ASTNumber ) {
                value = key.value;
            }
            // error but it cannot happen
            programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFSTR, value ) );
        }
        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, "" + node.keys.length ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DEFDIC ), node )
            .toProgram();
    } else if (node instanceof ASTType) {
        const length = node.members.length;
        for (let i = length-1; i >= 0; i--) {
            programBuilder.addBytecode(makeVariable(node.members[i]));
        }
        return programBuilder
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, ''+length))
            .addBytecode(makeVariable(node.name))
            .addBytecode(NewBytecode(PlBytecodeType.DEFTYP))
            .addEmpty()
            .addBytecode(makeVariable(node.name))
            .addBytecode(NewBytecode(DEFAULT_SET_BC))
            .toProgram();
    } else if ( node instanceof ASTAssign ) {
        programBuilder.addPWD( traverseAST( node.value ) );
        if ( node.pre ) {
            programBuilder.addPWD( traverseAST( node.pre ) );
        } else {
            programBuilder.addEmpty();
        }

        let bc;
        switch (node.type) {
            case ASTAssignType.INNER:
                bc = PlBytecodeType.DOASNI;
                break;
            case ASTAssignType.OUTER:
                bc = PlBytecodeType.DOASNO;
                break;
            case ASTAssignType.LOCAL:
                bc = PlBytecodeType.DOASNL;
                break;
        }

        programBuilder.addBytecode( makeVariable( node.variable ) );
        programBuilder.addBytecodeStretch( NewBytecode( bc ), node );
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
            const left = traverseAST( node.left );
            node.left.attribute = ASTAttributes.ASTCondition;
            return programBuilder
                .addPWD( left )
                .addBytecode( NewBytecode( PlBytecodeType.JMPIFF, '' + (right.program.length + 1) ) )
                .addStretch( node.left, left.program.length + 1 )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
                .addPWDStretch( right, node )
                .toProgram();
        } else if ( node.operator.type == PlTokenType.OR ) {
            let right = traverseAST( node.right );
            const left = traverseAST( node.left );
            node.left.attribute = ASTAttributes.ASTCondition;
            return programBuilder
                .addPWD( left )
                .addBytecode( NewBytecode( PlBytecodeType.JMPIFT, '' + (right.program.length + 1) ) )
                .addStretch( node.left, left.program.length + 1 )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) )
                .addPWDStretch( right, node )
                .toProgram();
        }

        return programBuilder
            .addPWD( traverseAST( node.right ) )
            .addPWD( traverseAST( node.left ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '2' ) )
            .addBytecodeStretch( NewBytecode( PlBytecodeType.DOFDCL, node.operator.content ), node )
            .toProgram();
    } else if ( node instanceof ASTUnary ) {
        programBuilder.addPWD( traverseAST( node.value ) );
        let bc;
        switch ( node.operator.type ) {
            case PlTokenType.INC: {
                bc = NewBytecode( PlBytecodeType.DOOINC );
                break;
            }
            case PlTokenType.DEC: {
                bc = NewBytecode( PlBytecodeType.DOODEC );
                break;
            }
            case PlTokenType.SUB: {
                bc = NewBytecode( PlBytecodeType.DONEGT );
                break;
            }
            case PlTokenType.NOT: {
                bc = NewBytecode( PlBytecodeType.DOLNOT );
                break;
            }
        }

        if ( bc ) {
            programBuilder
                .addBytecodeStretch( bc, node );
        }
        return programBuilder.toProgram();
    } else if ( node instanceof ASTReturn ) {
        if ( node.content ) {
            programBuilder.addPWD( traverseAST( node.content ) );
        } else {
            programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) );
        }
        return programBuilder.addBytecode( NewBytecode( PlBytecodeType.DORETN ) )
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTFunction ) {
        const block = makePureBlock( node.block );
        node.guards.reverse()
        for ( const guard of node.guards ) {
            if (guard == null)
                programBuilder.addEmpty();
            else
                programBuilder.addBytecode( makeVariable( guard ) )
                    .addStretch(guard, 1);
        }
        node.args.reverse();
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }
        let extraReturn = false;
        if (block.program.length == 0 || block.program[block.program.length - 1].type != PlBytecodeType.DORETN) {
            extraReturn = true;
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFFUN, '' + (block.program.length + + (extraReturn ? 2 : 0)) ) )
            .addPWD( block );

        if ( extraReturn ) {
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) )
                .addBytecode( NewBytecode( PlBytecodeType.DORETN ) );
        }

        return programBuilder.addEmpty()
            .addBytecode( NewBytecode( PlBytecodeType.DEFSTR, node.name.content ) )
            .addBytecodeStretch( NewBytecode( DEFAULT_SET_BC ), node )
            .toProgram();
    } else if ( node instanceof ASTClosure ) {
        const block = makePureBlock( node.block );
        node.guards.reverse()
        for ( const guard of node.guards ) {
            if (guard == null)
                programBuilder.addEmpty();
            else
                programBuilder.addBytecode( makeVariable( guard ) )
                    .addStretch(guard, 1);
        }
        node.args.reverse();
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }

        let extraReturn = false;
        if (block.program.length == 0 || block.program[block.program.length - 1].type != PlBytecodeType.DORETN) {
            extraReturn = true;
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFFUN, '' + (block.program.length + + (extraReturn ? 2 : 0)) ) )
            .addPWD( block );

        if ( extraReturn ) {
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) )
                .addBytecode( NewBytecode( PlBytecodeType.DORETN ) );
        }
        return programBuilder.toProgram();
    } else if ( node instanceof ASTImpl ) {
        programBuilder
            .addBytecode(NewBytecode(PlBytecodeType.DEFVAR, node.target.content ))
            .addBytecode(NewBytecode(PlBytecodeType.STKPOP))
            .addStretch(node.target);

        const block = makePureBlock( node.block );
        node.guards.reverse()
        for ( const guard of node.guards ) {
            if (guard == null)
                programBuilder.addEmpty();
            else
                programBuilder.addBytecode( makeVariable( guard ) )
                    .addStretch(guard, 1);
        }
        node.args.reverse();
        for ( const param of node.args ) {
            programBuilder.addBytecode( makeVariable( param ) );
        }
        let extraReturn = false;
        if (block.program.length == 0 || block.program[block.program.length - 1].type != PlBytecodeType.DORETN) {
            extraReturn = true;
        }
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) )
            .addBytecode( NewBytecode( PlBytecodeType.DEFFUN, '' + (block.program.length + + (extraReturn ? 2 : 0)) ) )
            .addPWD( block );

        if ( extraReturn ) {
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.DEFNUL ) )
                .addBytecode( NewBytecode( PlBytecodeType.DORETN ) );
        }
        programBuilder.addEmpty();

        const value = `${node.target.content}${METHOD_SEP}${node.name.content}`;
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.DEFSTR, value ) );
        programBuilder.addBytecodeStretch( NewBytecode(DEFAULT_SET_BC), node );
        return programBuilder.toProgram();
    } else if ( node instanceof ASTCall ) {
        node.args.reverse();
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
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.STKENT ) );

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

            node.conditions[i].attribute = ASTAttributes.ASTCondition;
            programBuilder
                .addPWD( condition )
                .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + length ) )
                .addStretch( node.conditions[i], condition.program.length + 1 )
                .addPWD( block );
        }
        if ( node.other ) {
            let other = makePureBlock( node.other );
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '' + other.program.length ) )
                .addPWD( other );
        }

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTFor ) {
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.STKENT ) );

        if ( node.start ) {
            programBuilder
                .addPWD( traverseAST( node.start ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );
        }

        let cond;
        let after;
        let condLength = 0;
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
        replaceBC(block, afterLength);

        // emit condition
        if ( cond ) {
            node.condition.attribute = ASTAttributes.ASTCondition;
            programBuilder
                .addPWD( cond )
                .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + afterLength + 1) ) )
                .addStretch( node.condition, cond.program.length + 1 );

        }

        // emit block
        programBuilder
            .addPWD( block );

        // emit after
        if ( after ) {
            programBuilder
                .addPWD( after )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );

        }

        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (block.program.length + afterLength + condLength + 1) ) );

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTWhile ) {
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.STKENT ) )

        let cond = traverseAST( node.condition );
        let block = makePureBlock( node.block );

        // replace breaks and continues
        replaceBC(block, 0);

        node.condition.attribute = ASTAttributes.ASTCondition;
        programBuilder
            .addPWD( cond )
            .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + 1) ) )
            .addStretch( node.condition, cond.program.length + 1 )
            .addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (cond.program.length + block.program.length + 2) ) );

        return programBuilder.addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTLoop ) {
        programBuilder.addBytecode( NewBytecode( PlBytecodeType.STKENT ) );

        let block = makePureBlock( node.block );
        let bodySize = block.program.length;

        // emit counter variable and compare
        if ( node.amount ) {
            const target = node.amount.getSpanToken();
            const assignment = new ASTAssign( [], undefined,
                new ASTVariable( [], LOOP_INDEX ),
                node.amount, DEFAULT_SET_AST );

            programBuilder
                .addPWD( traverseAST( assignment ) )
                .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );

            // i@ = n
            // while i@-- >= 0 {
            // }
            const cond = new ASTBinary( [],
                new ASTUnary( [ target ], NewFakePlToken( PlTokenType.DEC, "--" ), new ASTVariable( [], LOOP_INDEX ) ),
                new ASTNumber( [], '0' ),
                NewFakePlToken( PlTokenType.GTE, ">=" ) );
            const out = traverseAST( cond );

            node.amount.attribute = ASTAttributes.ASTCondition;
            programBuilder
                .addPWDNoDebug( out )
                .addStretch( node.amount, out.program.length )
                .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (bodySize + 1) ) );
            bodySize += out.program.length + 1;
        }

        replaceBC(block, 0);

        programBuilder.addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (bodySize + 1) ) );

        return programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
            .addEmpty()
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTMatch ) {
        let value = null;
        if ( node.value ) {
            value = new ASTVariable( [], MATCH_VALUE );
            const assignment = new ASTAssign( [], undefined, value, node.value, DEFAULT_SET_AST );
            programBuilder
                .addBytecode( NewBytecode( PlBytecodeType.STKENT ) )
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
            .addStretch( node )
            .toProgram();
    } else if ( node instanceof ASTEach ) {
        programBuilder
            .addBytecode( NewBytecode( PlBytecodeType.STKENT ) );

        // iter@ = target.iter()
        // while (i@ = iter@.next()).get(2) {
        //  KEY = i@.get(1).get(1)
        //  VALUE = i@.get(1).get(2)
        //  BLOCK
        // }

        const iter = new ASTVariable( [], EACH_ITER );
        const index = new ASTVariable( [], LOOP_INDEX );

        const target = node.iterator.getSpanToken();

        const dot = new ASTDot( [], node.iterator, new ASTVariable( [ target ], "iter" ) )
        dot.attribute = ASTAttributes.ASTCondition;
        const assignment = new ASTAssign( [], undefined,
            iter,
            new ASTCall( [], dot, [] ),
            DEFAULT_SET_AST
        );
        programBuilder
            .addPWD( traverseAST( assignment ) )
            .addBytecode( NewBytecode( PlBytecodeType.STKPOP ) );

        const one = new ASTVariable( [], '1' );
        const two = new ASTVariable( [], '2' );

        const condition = new ASTDot( [], new ASTAssign( [], undefined,
            index,
            new ASTCall( [ target ], new ASTDot( [], iter, new ASTVariable( [], "next" ) ), [] ),
            DEFAULT_SET_AST
        ), two );

        let inBlock = [];
        const valueAssign = new ASTAssign( [], undefined, node.value,
            new ASTDot( [], new ASTDot([], index, one), one), DEFAULT_SET_AST );
        inBlock.push( valueAssign );
        if ( node.key ) {
            const keyAssign = new ASTAssign( [], undefined, node.key,
                new ASTDot( [], new ASTDot([], index, one), two), DEFAULT_SET_AST );
            inBlock.push( keyAssign );
        }

        const cond = traverseAST( condition );
        const kvBlock = makePureBlock( new ASTBlock( [], inBlock ) );
        const block = makePureBlock( node.block );

        // replace breaks and continues
        replaceBC(block, 0);

        return programBuilder
            .addPWD( cond )
            .addBytecode( NewBytecode( PlBytecodeType.JMPICF, '' + (block.program.length + kvBlock.program.length + 1) ) )
            .addPWD( kvBlock )
            .addPWD( block )
            .addBytecode( NewBytecode( PlBytecodeType.JMPREL, '-' + (cond.program.length + block.program.length + kvBlock.program.length + 2) ) )
            .addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
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

function makeNull( node?: ASTNull ) {
    return NewBytecode( PlBytecodeType.DEFNUL, null );
}

function makeBool( node: ASTBoolean ) {
    return NewBytecode( PlBytecodeType.DEFBOL, "" + +node.value );
}

function makeString( node: ASTString ) {
    return NewBytecode( PlBytecodeType.DEFSTR, `${node.content}` );
}

function makeEvalBlock( node: ASTBlock ): PlProgram {
    return (new ProgramBuilder())
        .addBytecode( NewBytecode( PlBytecodeType.STKENT ) )
        .addPWD( EmitProgram( node.statements, false ) )
        .addBytecode( NewBytecode( PlBytecodeType.STKEXT ) )
        .toProgram();
}

function makePureBlock( node: ASTBlock ): PlProgram {
    return (new ProgramBuilder())
        .addPWD( EmitProgram( node.statements, false ) )
        .toProgram();
}
