import { NewBytecode, PlBytecode, PlBytecodeType } from "./bytecode";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTCall,
    ASTClosure,
    ASTDot,
    ASTFunction,
    ASTNode,
    ASTNull,
    ASTNumber,
    ASTProgram,
    ASTReturn,
    ASTStatement,
    ASTString,
    ASTType,
    ASTVariable
} from "../compiler/parsing/ast";
import { PlTokenType } from "../compiler/lexing/token";

const MEMBER_PREFIX = '@';

// TODO: Add Emitter Error

export function EmitProgram( ast: ASTProgram ): PlBytecode[] {
    let program = [];
    for ( const statement of ast ) {
        program.push( ...EmitStatement( statement ) );
    }
    return program;
}

export function EmitStatement( statement: ASTStatement ): PlBytecode[] {
    return traverseAST( statement );
}

function makeNumber( node: ASTNumber ) {
    return NewBytecode( PlBytecodeType.DEFNUM, '' + node.value, node.tokens[0] );
}

function makeVariable( node: ASTVariable ) {
    return NewBytecode( PlBytecodeType.DEFVAR, node.content, node.tokens[0] );
}

function makeNull( node: ASTNull ) {
    return NewBytecode( PlBytecodeType.DEFNUL, null, node.tokens[0] );
}

function makeBool( node: ASTBoolean ) {
    return NewBytecode( PlBytecodeType.DEFBOL, "" + +node.value, node.tokens[0] );
}

function makeString( node: ASTString ) {
    return NewBytecode( PlBytecodeType.DEFSTR, `"${node.content}"`, node.tokens[0] );
}

function makeType( node: ASTType ) {
    return NewBytecode( PlBytecodeType.DEFTYP, `'${node.content}'`, node.tokens[0] );
}

function makeEmpty() {
    return NewBytecode( PlBytecodeType.DEFETY );
}

function makeBlock( node: ASTBlock ) {
    return [
        NewBytecode( PlBytecodeType.OPNBLO, null, node.firstToken() ),
        ...EmitProgram( node.statements ), // TODO: Note, this might be an dependency
        NewBytecode( PlBytecodeType.CLSBLO, null, node.lastToken() ),
    ];
}

function traverseAST( node: ASTNode ): PlBytecode[] {
    if ( node instanceof ASTNumber ) {
        return [ makeNumber( node ) ];
    } else if ( node instanceof ASTVariable ) {
        return [ makeVariable( node ) ];
    } else if ( node instanceof ASTNull ) {
        return [ makeNull( node ) ];
    } else if ( node instanceof ASTBoolean ) {
        return [ makeBool( node ) ];
    } else if ( node instanceof ASTString ) {
        return [ makeString( node ) ];
    } else if ( node instanceof ASTType ) {
        return [ makeType( node ) ];
    } else if ( node instanceof ASTAssign ) {
        let code = traverseAST( node.value );
        if ( node.pre ) {
            code.push( ...traverseAST( node.pre ) );
        } else {
            code.push( makeEmpty() );
        }
        code.push( makeVariable( node.variable ) );
        code.push( NewBytecode( PlBytecodeType.DOASGN, null, node.tokens[0] ) );
        return code;
    } else if ( node instanceof ASTDot ) {
        return [
            ...traverseAST( node.left ),
            ...traverseAST( node.right ),
            NewBytecode( PlBytecodeType.DOFIND, null, node.tokens[0] )
        ];
    } else if ( node instanceof ASTBinary ) {
        let type = node.operator.type;
        if ( type == PlTokenType.AND || type == PlTokenType.OR ) {
            const bc = type == PlTokenType.AND ? PlBytecodeType.DOLAND : PlBytecodeType.DOLOR_;
            // short circuit
            let code = traverseAST( node.left );
            code.push( NewBytecode( bc, null, node.operator ) );
            code.push( ...traverseAST( node.right ) );
            code.push( NewBytecode( PlBytecodeType.CLSLOG ) );
            return code;
        }
        return [
            ...traverseAST( node.right ),
            ...traverseAST( node.left ),
            NewBytecode( PlBytecodeType.DEFNUM, '2' ),
            NewBytecode( PlBytecodeType.DEFVAR, node.operator.content, node.operator ),
            NewBytecode( PlBytecodeType.DOCALL )
        ];
    } else if ( node instanceof ASTReturn ) {
        let args = [];
        if ( node.content ) {
            args.push( ...traverseAST( node.content ) );
        } else {
            args.push( NewBytecode( PlBytecodeType.DEFNUL ) );
        }
        return [ ...args, NewBytecode( PlBytecodeType.DORETN, null, node.tokens[0] ) ];
    } else if ( node instanceof ASTFunction ) {
        let code = makeBlock( node.block );
        for ( const param of node.args ) {
            code.push( makeVariable( param ) );
        }
        code.push( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        code.push( NewBytecode( PlBytecodeType.DEFFUN, null, node.tokens[0] ) );
        // assignment
        return code;
    } else if ( node instanceof ASTClosure ) {
        let code = makeBlock( node.block );
        for ( const param of node.args ) {
            code.push( makeVariable( param ) );
        }
        code.push( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        code.push( NewBytecode( PlBytecodeType.DEFFUN, null, node.tokens[0] ) );
        return code;
    } else if ( node instanceof ASTCall ) {
        // push arguments
        // push arity
        let code = [];
        for ( const arg of node.args ) {
            code.push( ...traverseAST( arg ) );
        }
        code.push( NewBytecode( PlBytecodeType.DEFNUM, '' + node.args.length ) );
        code.push( ...traverseAST( node.target ) );
        code.push( NewBytecode( PlBytecodeType.DOCALL, null ) );
        return code;
    }
    else {
        // error
        console.log( "DEBUG WARNING!" );
        return [ NewBytecode( PlBytecodeType.DORETN, null, node.firstToken() ) ];
    }
}

// TODO: Write AND and OR using jumps
