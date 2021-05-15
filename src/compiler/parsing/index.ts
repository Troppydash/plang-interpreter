import { NewPlProblem, NewPlProblemAt, PlHereType, PlProblem } from "../../problem/problem";
import { Lexer } from "../lexing";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTBreak,
    ASTCall,
    ASTClosure,
    ASTContinue, ASTCreate,
    ASTDict,
    ASTDictKey,
    ASTDot,
    ASTEach,
    ASTExport,
    ASTExpression,
    ASTFor,
    ASTFunction,
    ASTIf,
    ASTImpl,
    ASTImport,
    ASTList,
    ASTLoop,
    ASTMatch,
    ASTNull,
    ASTNumber,
    ASTProgram,
    ASTReturn,
    ASTStatement,
    ASTString,
    ASTType,
    ASTUnary,
    ASTVariable,
    ASTWhile,
    CreateSpanToken
} from "./ast";
import PlToken, { PlTokenToPlVariable, PlTokenType, TOKEN_OPERATORS, NAME_BLACKLIST } from "../lexing/token";
import { PlProblemCode } from "../../problem/codes";

class ErrTokenException {

}


export const CREATE_MAGIC = '@';
function stripSep(ast: ASTVariable) {
    if (ast.content.startsWith(CREATE_MAGIC)) {
        ast.content = ast.content.slice(1);
    }
}

interface Parser {
    readonly lexer: Lexer;

    parseOnce(): ASTStatement | null;  // parse as little as possible to return
    parseAll(): ASTStatement[];  // parse as much as possible

    getProblems(): PlProblem[];
}

// class PlParser implements Parser {}

// this parser is only an ast parser, the bytecode emitting parser will not make an ast tree
export class PlAstParser implements Parser {
    readonly lexer: Lexer;

    private cacheToken: PlToken[];
    private problems: PlProblem[];

    constructor( lexer: Lexer ) {
        this.lexer = lexer;

        this.cacheToken = [];
        this.problems = [];
    }

    // implementations

    getProblems(): PlProblem[] {
        return [ ...this.problems, ...this.lexer.getProblems() ];
    }

    parseOnce(): ASTStatement | null {
        try {
            return this.pStatement();
        } catch ( e ) {
            if ( e instanceof ErrTokenException ) {
                return null;
            }
            // normal error
            this.newProblem( this.getToken(), "DE0001", '' + e );
            return null;
        }
    }

    parseAll(): ASTProgram | null {
        let statements = [];
        while ( true ) {
            // check for end of file
            try {
                if ( this.isEOF() ) {
                    break;
                }
            } catch ( e ) {
                return null;
            }

            const statement = this.parseOnce();
            if ( statement == null ) {
                return null;
            }
            statements.push( statement );
        }
        return statements;
    }

    isEOF() {
        this.clearLF();
        const peekToken = this.peekToken();
        return peekToken.type == PlTokenType.EOF;
    }

    // helper methods

    getToken(): PlToken {
        if ( this.cacheToken.length != 0 ) {
            return this.cacheToken.pop();
        }
        return this.lexer.nextToken();
    }

    nextToken(): PlToken | null {
        // do not report null errors, as it is handled in lexer already
        const token = this.getToken();
        if ( token.type == PlTokenType.ERR ) {
            throw new ErrTokenException();
        }
        return token;
    }

    peekToken(): PlToken | null {
        const token = this.getToken();
        this.cacheToken.push( token );
        if ( token.type == PlTokenType.ERR ) {
            throw new ErrTokenException();
        }
        return token;
    }

    pushToken( token: PlToken ) {
        this.cacheToken.push( token );
    }

    expectedPeekToken( expected: PlTokenType, code: PlProblemCode, token: PlToken | null, ...args: string[] ): PlToken | null {
        const result = this.tryPeekToken( expected, code, token, ...args );
        if ( result == null ) {
            return null;
        }
        return this.nextToken();
    }

    tryPeekToken( expected: PlTokenType, code: PlProblemCode, errorToken: PlToken | null, ...args: string[] ): PlToken | null {
        const peekToken = this.peekToken();
        if ( peekToken.type != expected ) {
            if ( errorToken == null ) {
                this.problems.push( NewPlProblem( code, peekToken.info, ...args ) );
            } else {
                this.problems.push( NewPlProblemAt( code, errorToken.info, "after", ...args ) );
            }
            return null;
        }
        return peekToken;
    }


    tryPeekTokens( expects: PlTokenType[], code: PlProblemCode, errorToken: PlToken | null, ...args: string[] ): PlToken | null {
        const peekToken = this.peekToken();
        let found = false;
        for ( const type of expects ) {
            if ( peekToken.type == type ) {
                found = true;
                break;
            }
        }
        if ( !found ) {
            if ( errorToken == null ) {
                this.problems.push( NewPlProblem( code, peekToken.info, ...args ) );
            } else {
                this.problems.push( NewPlProblemAt( code, errorToken.info, "after", ...args ) );
            }
            return null;
        }
        return peekToken;
    }

    peekMatch( types: PlTokenType[] ) {
        const peekToken = this.peekToken();
        for ( const type of types ) {
            if ( peekToken.type == type ) {
                return true;
            }
        }
        return false;
    }

    clearLF() {
        while ( true ) {
            const token = this.peekToken();
            if ( token.type == PlTokenType.LF ) {
                this.nextToken();
            } else {
                break;
            }
        }
    }

    newProblem( token: PlToken, code: PlProblemCode, ...args: string[] ) {
        this.problems.push( NewPlProblem( code, token.info, ...args ) );
        return null;
    }

    newProblemAt( token: PlToken, code: PlProblemCode, here: PlHereType, ...args: string[] ) {
        this.problems.push( NewPlProblemAt( code, token.info, here, ...args ) );
        return null;
    }

    // recursive parser is here
    // a null return means error, check this.problems for any problems

    // always start a pMethod with the token pointer before the expected token
    pStatement(): ASTStatement | null {
        // try to parse a statement
        const leadingToken = this.peekToken();
        if ( leadingToken == null ) {
            return null;
        }

        let statement: ASTStatement;
        switch ( leadingToken.type ) {
            case PlTokenType.LBRACE:
                statement = this.pBlock();
                break;
            case PlTokenType.FUNC:
                statement = this.pFunction();
                break;
            case PlTokenType.IMPL:
                statement = this.pImpl();
                break;
            case PlTokenType.IMPORT:
                statement = this.pImport();
                break;
            case PlTokenType.EXPORT:
                statement = this.pExport();
                break;
            case PlTokenType.RETURN:
                statement = this.pReturn();
                break;
            case PlTokenType.BREAK:
                statement = this.pBreak();
                break;
            case PlTokenType.CONTINUE:
                statement = this.pContinue();
                break;
            case PlTokenType.IF:
                statement = this.pIf();
                break;
            case PlTokenType.EACH:
                statement = this.pEach();
                break;
            case PlTokenType.LOOP:
                statement = this.pLoop();
                break;
            case PlTokenType.WHILE:
                statement = this.pWhile();
                break;
            case PlTokenType.FOR:
                statement = this.pFor();
                break;
            case PlTokenType.MATCH:
                statement = this.pMatch();
                break;
            case PlTokenType.TYPE:
                statement = this.pType();
                break;
            default:
                statement = this.pExpression();
                break;
        }
        if ( statement == null ) {
            return null;
        }

        const peekToken = this.peekToken();
        if ( peekToken.type != PlTokenType.LF ) {
            if ( peekToken.type != PlTokenType.EOF ) {
                this.newProblemAt( statement.getSpanToken(), "ET0001", "after" );
                return null;
            }
        } else {
            this.nextToken();
        }
        return statement;
    }

    // these all expect the first token being correct

    pBlock(): ASTBlock | null {
        let tokens = [ this.nextToken() ];
        let statements = [];
        while ( true ) {
            this.clearLF();
            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.RBRACE ) {
                break;
            }
            if ( peekToken.type == PlTokenType.EOF ) {
                this.newProblem( tokens[0], "CE0001" );
                return null;
            }

            const statement = this.pStatement();
            if ( statement == null ) {
                return null;
            }
            statements.push( statement );
        }
        tokens.push( this.nextToken() );

        return new ASTBlock( tokens, statements );
    }

    pFunction(): ASTFunction | null {
        let tokens = [ this.nextToken() ];
        const nameToken = this.tryPeekToken( PlTokenType.VARIABLE, "ET0013", null );
        if ( nameToken == null ) {
            return null;
        }
        const name = this.pVariable();
        stripSep(name);

        const nextToken = this.expectedPeekToken( PlTokenType.LPAREN, "ET0014", nameToken );
        if ( nextToken == null ) {
            return null;
        }

        // parse parameters
        const param = this.pParam( nextToken, "ET0016", "ET0015" );
        if ( param == null ) {
            return null;
        }

        const lastParen = param[1][param[1].length - 1];

        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0017", lastParen ) == null ) {
            return null;
        }

        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTFunction( [ ...tokens, ...param[1] ], name, param[0], block );
    }

    pImpl(): ASTImpl | null {
        const tokens = [ this.nextToken() ];

        let name: ASTVariable;
        const peekToken = this.peekToken();
        if (peekToken.type == PlTokenType.VARIABLE) {
            name = this.pVariable();
            stripSep(name);
        } else if (TOKEN_OPERATORS.includes(peekToken.type) || peekToken.type == PlTokenType.TYPE) {
            this.nextToken();
            const token = PlTokenToPlVariable(peekToken);
            name = new ASTVariable( [ token ], token.content )
        } else {
            this.newProblem(peekToken, "ET0027");
            return null;
        }

        const nextToken = this.expectedPeekToken( PlTokenType.LPAREN, "ET0028", name.getSpanToken() );
        if ( nextToken == null ) {
            return null;
        }

        const param = this.pParam( nextToken, "ET0016", "ET0015" );
        if ( param == null ) {
            return null;
        }

        if ( param[0].length == 0 ) {
            this.newProblem( CreateSpanToken( param[1][0], param[1][param[1].length - 1] ), "LP0002" );
            return null;
        }

        const lastParen = param[1][param[1].length - 1];
        const forToken = this.expectedPeekToken( PlTokenType.FOR, "ET0029", lastParen );
        if ( forToken == null ) {
            return null;
        }

        if (this.peekToken().type == PlTokenType.EOF) {
            this.newProblemAt(forToken, "ET0043", "after");
            return null;
        }
        const type = this.pVariable();
        stripSep(type);


        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0030", type.getSpanToken() ) == null ) {
            return null;
        }
        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTImpl( [ ...tokens, ...param[1], forToken ], name, param[0], type, block );
    }

    pType(): ASTType | null {
        const tokens = [this.nextToken()];

        const nameToken = this.peekToken();
        if (NAME_BLACKLIST.includes(nameToken.type)) {
            return this.newProblem(nameToken, "ET0044");
        }
        const name = this.pVariable();
        stripSep(name);

        const nextToken = this.expectedPeekToken( PlTokenType.LPAREN, "ET0045", tokens[0] );
        if ( nextToken == null ) {
            return null;
        }
        tokens.push(nextToken);

        const param = this.pParam(nextToken, "ET0046", "ET0047", "CE0009");
        tokens.push(...param[1]);

        const members = param[0];

        return new ASTType(tokens, name, members);
    }

    pImport(): ASTImport | null {
        const tokens = [ this.nextToken() ];
        const path = this.pPath();
        if ( path == null ) {
            return null;
        }
        tokens.push( ...path[1] );

        let alias = null;
        let select = null;

        // can be sure that the peek token does not have problems because of pPath()
        const peekToken = this.peekToken();
        switch ( peekToken.type ) {
            case PlTokenType.AS: {
                tokens.push( this.nextToken() );
                if ( this.tryPeekToken( PlTokenType.VARIABLE, "ET0038", null ) == null ) {
                    return null;
                }
                alias = this.pVariable();
                stripSep(alias);
                break;
            }
            case PlTokenType.SELECT: {
                tokens.push( this.nextToken() );

                const peek = this.peekToken();
                if ( peek.type == PlTokenType.MUL ) {
                    tokens.push( this.nextToken() );
                    select = [];
                    break;
                }

                if ( peek.type == PlTokenType.LF ) {
                    this.newProblemAt( peekToken, "ET0041", "after" );
                    return null;
                }

                let param = this.pParam( peekToken, "ET0039", "ET0040", "CE0006", PlTokenType.LF );
                if ( param == null ) {
                    return null;
                }
                select = param[0];
                tokens.push( ...param[1] );
                break;
            }
        }

        return new ASTImport( tokens, path[0], alias, select );
    }

    pExport(): ASTExport | null {
        const token = this.nextToken();
        if ( this.peekMatch( [ PlTokenType.LF, PlTokenType.EOF ] ) ) {
            this.newProblem( token, "ET0020" );
            return null;
        }
        const value = this.pExpression();
        if ( value == null ) {
            return null;
        }
        return new ASTExport( [ token ], value );
    }

    pReturn(): ASTReturn | null {
        const token = [ this.nextToken() ];
        if ( this.peekToken().type == PlTokenType.LF ) {
            return new ASTReturn( token );
        }
        const value = this.pExpression();
        if ( value == null ) {
            return null;
        }
        return new ASTReturn( token, value );
    }

    pBreak(): ASTBreak | null {
        return new ASTBreak( [ this.nextToken() ] );
    }

    pContinue(): ASTContinue | null {
        return new ASTContinue( [ this.nextToken() ] );
    }

    pIf(): ASTIf | null {
        let tokens = [ this.nextToken() ];
        let conditions = [];
        let blocks = [];

        let condition = this.pExpression();
        if ( condition == null ) {
            return null;
        }
        conditions.push( condition );
        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0021", condition.getSpanToken() ) == null ) {
            return null;
        }

        let block = this.pBlock();
        if ( block == null ) {
            return null;
        }
        blocks.push( block );

        while ( true ) {
            const token = this.peekToken();
            if ( token.type != PlTokenType.ELIF ) {
                break;
            }
            tokens.push( token );
            this.nextToken();

            condition = this.pExpression();
            if ( condition == null ) {
                return null;
            }
            conditions.push( condition );
            if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0022", condition.getSpanToken() ) == null ) {
                return null;
            }
            block = this.pBlock();
            if ( block == null ) {
                return null;
            }
            blocks.push( block );
        }

        let other = null;
        const token = this.peekToken();
        if ( token.type == PlTokenType.ELSE ) {
            tokens.push( token );
            this.nextToken();

            if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0023", token ) == null ) {
                return null;
            }
            other = this.pBlock();
            if ( other == null ) {
                return null;
            }
        }

        return new ASTIf( tokens, conditions, blocks, other );
    }

    pEach(): ASTEach | null {
        const tokens = [ this.nextToken() ]
        if ( this.tryPeekToken( PlTokenType.VARIABLE, "ET0024", null ) == null ) {
            return null;
        }
        const value = this.pVariable();
        stripSep(value);

        let key = null;
        if ( this.peekToken().type == PlTokenType.COMMA ) {
            tokens.push( this.nextToken() );
            if ( this.tryPeekToken( PlTokenType.VARIABLE, "ET0024", null ) == null ) {
                return null;
            }
            key = this.pVariable();
            stripSep(key);
        }

        if ( this.tryPeekToken( PlTokenType.OF, "ET0025", key == null ? value.getSpanToken() : key.getSpanToken() ) == null ) {
            return null;
        }
        tokens.push( this.nextToken() );
        const array = this.pExpression();
        if ( array == null ) {
            return null;
        }

        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0025", array.getSpanToken() ) == null ) {
            return null;
        }

        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTEach( tokens, value, array, block, key );
    }

    pLoop(): ASTLoop | null {
        const tokens = [ this.nextToken() ];
        const peekToken = this.peekToken();
        let expression = null;
        if ( peekToken.type != PlTokenType.LBRACE ) {
            expression = this.pExpression();
        }
        const eToken = expression == null ? tokens[0] : expression.getSpanToken();
        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0018", eToken ) == null ) {
            return null;
        }
        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTLoop( tokens, block, expression );
    }

    pWhile(): ASTWhile | null {
        const tokens = [ this.nextToken() ];
        const condition = this.pExpression();
        if ( condition == null ) {
            return null;
        }

        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0019", condition.getSpanToken() ) == null ) {
            return null;
        }

        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTWhile( tokens, condition, block );
    }

    pFor(): ASTFor | null {
        let tokens = [ this.nextToken() ];
        let pre = null;
        let condition = null;
        let post = null;

        if ( this.peekToken().type == PlTokenType.SEMICOLON ) {
            tokens.push( this.nextToken() );
        } else {
            pre = this.pExpression();
            if ( pre == null ) {
                return null;
            }
            const semi = this.expectedPeekToken( PlTokenType.SEMICOLON, "ET0031", pre.getSpanToken() );
            if ( semi == null ) {
                return null;
            }
            tokens.push( semi );
        }

        if ( this.peekToken().type == PlTokenType.SEMICOLON ) {
            tokens.push( this.nextToken() );
        } else {
            condition = this.pExpression();
            if ( condition == null ) {
                return null;
            }
            const semi = this.expectedPeekToken( PlTokenType.SEMICOLON, "ET0031", condition.getSpanToken() );
            if ( semi == null ) {
                return null;
            }
            tokens.push( semi );
        }

        if ( this.peekToken().type != PlTokenType.LBRACE ) {
            post = this.pExpression();
            if ( post == null ) {
                return null;
            }
            if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0032", post.getSpanToken() ) == null ) {
                return null;
            }
        }

        let block = this.pBlock();
        if ( block == null ) {
            return null;
        }

        return new ASTFor( tokens, block, pre, condition, post );
    }

    pMatch(): ASTMatch | null {
        let tokens = [ this.nextToken() ];
        let value = null;
        let expressions = [];
        let blocks = [];
        let other = null;

        if ( this.peekToken().type != PlTokenType.LBRACE ) {
            value = this.pExpression();
            if ( value == null ) {
                return null;
            }
        }

        const lbrace = this.expectedPeekToken( PlTokenType.LBRACE, "ET0033", value == null ? tokens[0] : value.getSpanToken() );
        if ( lbrace == null ) {
            return;
        }
        tokens.push( lbrace );

        // case parsing
        while ( true ) {
            this.clearLF();

            let exitWhile = false;

            const nextToken = this.peekToken();
            switch ( nextToken.type ) {
                case PlTokenType.CASE: {
                    tokens.push( this.nextToken() );

                    const args = this.pArgs( nextToken, "ET0034", "ET0035", PlTokenType.LBRACE );
                    if ( args == null ) {
                        return null;
                    }

                    if ( args[0].length == 0 ) {
                        this.newProblemAt( nextToken, "LP0003", "after" );
                        return null;
                    }

                    const block = this.pBlock();
                    if ( block == null ) {
                        return null;
                    }
                    tokens.push( ...args[1] );
                    expressions.push( args[0] );
                    blocks.push( block );
                    break;
                }
                case PlTokenType.DEFAULT: {
                    if ( other != null ) {
                        this.newProblem( nextToken, "LP0001" );
                        return null;
                    }

                    tokens.push( this.nextToken() );

                    if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0035", nextToken ) == null ) {
                        return null;
                    }
                    const block = this.pBlock();
                    if ( block == null ) {
                        return null;
                    }
                    other = block;
                    break;
                }
                case PlTokenType.RBRACE: {
                    tokens.push( this.nextToken() );
                    exitWhile = true;
                    break;
                }
                default: {
                    if ( nextToken.type == PlTokenType.LF || nextToken.type == PlTokenType.EOF ) {
                        this.newProblem( lbrace, "CE0007" );
                    } else {
                        this.newProblem( nextToken, "ET0042", nextToken.content );
                    }
                    return null;
                }
            }
            if ( exitWhile ) {
                break;
            }
        }

        return new ASTMatch( tokens, value, expressions, blocks, other );
    }


    // expressions

    pExpression(): ASTExpression | null {
        return this.pAssign();
    }

    pAssign(): ASTAssign | ASTExpression | null {
        const left = this.pLogical();
        if ( left == null )
            return null;

        const peekToken = this.peekToken();
        if ( peekToken.type == PlTokenType.ASGN ) {

            let pre;
            let variable;

            if ( left instanceof ASTVariable ) {
                pre = null;
                variable = left;
            } else if ( left instanceof ASTDot ) {
                let right = left;
                while ( right.right instanceof ASTDot ) {
                    right = right.right;
                }
                pre = left.left;
                variable = right.right;
            } else {
                this.newProblem( left.getSpanToken(), "ET0002" );
                return null;
            }

            this.nextToken();
            const value = this.pExpression();
            if ( value == null ) {
                return null;
            }
            if (variable.content.startsWith(CREATE_MAGIC)) {
                variable.content = variable.content.slice(1);
                return new ASTCreate( [ peekToken ], pre, variable, value );
            }
            return new ASTAssign( [ peekToken ], pre, variable, value );
        }

        return left;
    }

    pLogical(): ASTExpression | null {
        let left = this.pCompare();
        if ( left == null ) {
            return null;
        }

        while ( this.peekMatch( [ PlTokenType.AND, PlTokenType.OR ] ) ) {
            const token = this.nextToken();
            const right = this.pCompare();
            if ( right == null ) {
                return null;
            }
            left = new ASTBinary( [ token ], left, right, token );
        }

        return left;
    }

    pCompare(): ASTExpression | null {
        let left = this.pPlus();
        if ( left == null ) {
            return null;
        }

        while ( this.peekMatch( [ PlTokenType.GT, PlTokenType.GTE, PlTokenType.LT, PlTokenType.LTE, PlTokenType.EQ, PlTokenType.NEQ ] ) ) {
            const token = this.nextToken();
            const right = this.pPlus();
            if ( right == null ) {
                return null;
            }
            left = new ASTBinary( [ token ], left, right, token );
        }

        return left;
    }

    pPlus(): ASTExpression | null {
        let left = this.pMult();
        if ( left == null ) {
            return null;
        }

        while ( this.peekMatch( [ PlTokenType.ADD, PlTokenType.SUB ] ) ) {
            const token = this.nextToken();
            const right = this.pMult();
            if ( right == null ) {
                return null;
            }
            left = new ASTBinary( [ token ], left, right, token );
        }

        return left;

    }

    pMult(): ASTExpression | null {
        let left = this.pPrefix();
        if ( left == null ) {
            return null;
        }

        while ( this.peekMatch( [ PlTokenType.MUL, PlTokenType.DIV ] ) ) {
            const token = this.nextToken();
            const right = this.pPrefix();
            if ( right == null ) {
                return null;
            }
            left = new ASTBinary( [ token ], left, right, token );
        }

        return left;
    }

    pPrefix(): ASTExpression | null {
        if ( this.peekMatch( [ PlTokenType.NOT, PlTokenType.ADD, PlTokenType.SUB ] ) ) {
            const token = this.nextToken();
            const value = this.pPrefix();
            return new ASTUnary( [ token ], token, value );
        }
        return this.pPostfix();
    }

    pPostfix(): ASTExpression | null {
        let left = this.pCall();
        if ( left == null ) {
            return null;
        }

        while ( this.peekMatch( [ PlTokenType.INC, PlTokenType.DEC ] ) ) {
            if ( !(left instanceof ASTVariable) && !(left instanceof ASTUnary) ) {
                this.newProblem( left.getSpanToken(), "ET0005" );
                return null;
            }
            const token = this.nextToken();
            left = new ASTUnary( [ token ], token, left );
        }
        return left;
    }

    pCall(): ASTExpression | null {
        let left = this.pPrimary();
        if ( left == null ) {
            return null;
        }

        while ( true ) {
            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.LPAREN ) {
                this.nextToken();
                const args = this.pArgs( peekToken, "ET0008" );
                if ( args == null ) {
                    return null;
                }
                left = new ASTCall( [ peekToken, ...args[1] ], left, args[0] );
                continue;
            }
            if ( peekToken.type == PlTokenType.DOT ) {
                this.nextToken();
                const peek = this.peekToken();
                if (NAME_BLACKLIST.includes(peek.type)) {
                    return this.newProblem(peek, "ET0003");
                }
                const right = this.pVariable();
                stripSep(right);

                left = new ASTDot( [ peekToken ], left, right );
                continue;
            }
            // try parsing no paren
            // This is beyond stupid
            const args = this.pArgsNoParen();
            if ( args == null ) {
                return null;
            }
            if ( args[0].length > 0 ) {
                left = new ASTCall( [ peekToken, ...args[1] ], left, args[0] );
            }
            break;
        }
        return left;
    }

    pPrimary(): ASTExpression | null {
        const token = this.peekToken();
        switch ( token.type ) {
            case PlTokenType.LPAREN:
                return this.pGroup();
            case PlTokenType.VARIABLE: {
                this.nextToken();
                let type = "";
                if ( token.content == "list" ) {
                    if ( this.peekToken().type == PlTokenType.LPAREN ) {
                        type = "l";
                    }
                } else if ( token.content == "dict" ) {
                    if ( this.peekToken().type == PlTokenType.LPAREN ) {
                        type = "d";
                    }
                }
                this.pushToken( token );

                switch ( type ) {
                    case 'l':
                        return this.pList();
                    case 'd':
                        return this.pDict();
                    default:
                        return this.pVariable();
                }
            }
            case PlTokenType.NUMBER:
                return this.pNumber();
            case PlTokenType.STR:
                return this.pString();
            case PlTokenType.BOOLEAN:
                return this.pBoolean();
            case PlTokenType.NULL:
                return this.pNull();
            case PlTokenType.FUNC:
                return this.pClosure();
        }

        this.newProblem( token, "ET0004", token.content );
        return null;
    }

    pClosure(): ASTClosure | null {
        const token = this.nextToken();
        if ( this.expectedPeekToken( PlTokenType.LPAREN, "ET0014", token ) == null ) {
            return null;
        }

        const param = this.pParam( token, "ET0016", "ET0015" );
        if ( param == null ) {
            return null;
        }

        const lastParen = param[1][param[1].length - 1];

        if ( this.tryPeekToken( PlTokenType.LBRACE, "ET0017", lastParen ) == null ) {
            return null;
        }

        const block = this.pBlock();
        if ( block == null ) {
            return null;
        }
        return new ASTClosure( [ token, ...param[1] ], param[0], block );
    }

    pVariable(): ASTVariable | null {
        const token = PlTokenToPlVariable(this.nextToken());
        return new ASTVariable( [ token ], token.content );
    }

    pNumber(): ASTNumber | null {
        const token = this.nextToken();
        return new ASTNumber( [ token ], token.content );
    }

    pBoolean(): ASTBoolean | null {
        const token = this.nextToken();
        return new ASTBoolean( [ token ], token.content == 'true' ? '1' : '0' );
    }

    pNull(): ASTNull | null {
        const token = this.nextToken();
        return new ASTNull( [ token ] );
    }

    pString(): ASTString | null {
        const token = this.nextToken();
        return new ASTString( [ token ], token.content );
    }

    pList(): ASTList | null {
        let tokens = [ this.nextToken() ];
        let peek = this.expectedPeekToken( PlTokenType.LPAREN, "ET0007", tokens[0] );
        if ( peek == null ) {
            return null;
        }
        tokens.push( peek );

        const result = this.pArgs( peek, "ET0006", "CE0004" );
        if ( result == null ) {
            return null;
        }
        tokens.push( ...result[1] );
        return new ASTList( tokens, result[0] );
    }

    pDict(): ASTDict | null {
        let tokens = [ this.nextToken() ];
        let peek = this.expectedPeekToken( PlTokenType.LPAREN, "ET0010", tokens[0] );
        if ( peek == null ) {
            return null;
        }
        tokens.push( peek );

        let keys = [];
        let values = [];
        // parse arguments
        while ( true ) {
            this.clearLF();
            const token = this.peekToken();
            if ( token.type == PlTokenType.RPAREN ) {
                break;
            }
            if ( token.type == PlTokenType.EOF ) {
                this.newProblem( peek, "CE0003" );
                return null;
            }

            const result = this.pPair();
            if ( result == null ) {
                return null;
            }

            this.clearLF();

            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.COMMA ) {
                this.nextToken();
            } else if ( peekToken.type != PlTokenType.RPAREN ) {
                this.newProblem( result[2].getSpanToken(), peekToken.type == PlTokenType.EOF ? "CE0003" : "ET0012" );
                return null;
            }
            keys.push( result[0] );
            tokens.push( result[1] )
            values.push( result[2] );
        }
        // push the last rparen
        tokens.push( this.nextToken() );

        return new ASTDict( tokens, keys, values );
    }

    pGroup(): ASTExpression | null {
        const left = this.nextToken();
        const expression = this.pExpression();
        if ( expression == null ) {
            return null;
        }
        if ( this.expectedPeekToken( PlTokenType.RPAREN, "CE0002", left ) == null ) {
            return null;
        }
        return expression;
    }


    // this is only used for dict() parsing
    pPair(): [ ASTDictKey, PlToken, ASTExpression ] | null {
        const token = this.peekToken();
        if (NAME_BLACKLIST.includes(token.type)) {
            this.newProblem(token, "ET0009");
            return null;
        }
        const key = this.pVariable();
        if ( key == null ) {
            return null;
        }
        stripSep(key);

        const colon = this.expectedPeekToken( PlTokenType.COLON, "ET0011", token );
        if ( colon == null ) {
            return null;
        }
        const value = this.pExpression();
        if ( value == null ) {
            return null;
        }
        return [ key as ASTDictKey, colon, value ];
    }

    // this is only used for call args and list item
    pArgs(
        startToken: PlToken,
        commaCode: PlProblemCode,
        endTokenCode: PlProblemCode = "CE0005",
        endToken: PlTokenType = PlTokenType.RPAREN,
    ): [ ASTExpression[], PlToken[] ] | null {
        let expressions = [];
        let tokens = [];
        while ( true ) {
            this.clearLF();
            const token = this.peekToken();
            if ( token.type == endToken ) {
                break;
            }
            if ( token.type == PlTokenType.EOF ) {
                this.newProblem( startToken, endTokenCode );
                return null;
            }

            const expression = this.pExpression();
            if ( expression == null ) {
                return null;
            }

            this.clearLF();

            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.COMMA ) {
                this.nextToken();
            } else if ( peekToken.type == PlTokenType.EOF ) {
                this.newProblem( startToken, endTokenCode );
                return null;
            } else if ( peekToken.type != endToken ) {
                this.newProblemAt( expression.getSpanToken(), commaCode, "after" );
                return null;
            }
            tokens.push( peekToken );
            expressions.push( expression );
        }
        tokens.push( this.nextToken() );
        return [ expressions, tokens ];
    }

    pArgsNoParen() {
        let expressions = [];
        let tokens = [];
        while ( true ) {
            if (!this.peekMatch([PlTokenType.VARIABLE, PlTokenType.STR, PlTokenType.BOOLEAN, PlTokenType.NUMBER, PlTokenType.TYPE, PlTokenType.FUNC ])) {
                break;
            }

            const expression = this.pExpression();
            if ( expression == null ) {
                return null;
            }

            expressions.push( expression );
            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.COMMA ) {
                this.nextToken();
                tokens.push( peekToken );
            } else {
                break;
            }
        }
        return [ expressions, tokens ];
    }

    // this is used for function, impl, and import select param parsing
    pParam(
        startToken: PlToken,
        commaCode: PlProblemCode,
        variableError: PlProblemCode,
        endTokenCode: PlProblemCode = "CE0006",
        endToken: PlTokenType = PlTokenType.RPAREN,
        keep: boolean = false
    ): [ ASTVariable[], PlToken[] ] | null {
        let variables = [];
        let tokens = [];
        while ( true ) {
            if ( !keep ) {
                this.clearLF();
            }
            const token = this.peekToken();
            if ( token.type == endToken ) {
                break;
            }

            const variableToken = this.peekToken();
            if (variableToken.type == PlTokenType.EOF) {
                this.newProblem(variableToken, variableError);
                return null;
            }
            const variable = this.pVariable();
            stripSep(variable);

            if ( !keep ) {
                this.clearLF();
            }

            const peekToken = this.peekToken();
            if ( peekToken.type == PlTokenType.COMMA ) {
                this.nextToken();
            } else if ( peekToken.type == PlTokenType.EOF ) {
                this.newProblem( startToken, endTokenCode );
                return null;
            } else if ( peekToken.type != endToken ) {
                this.newProblemAt( variableToken, commaCode, "after" );
                return null;
            }
            tokens.push( peekToken );
            variables.push( variable );
        }
        if ( !keep ) {
            tokens.push( this.nextToken() );
        }
        return [ variables, tokens ];
    }

    // this is only used for imports
    pPath(): [ ASTVariable[], PlToken[] ] | null {
        let tokens = [];
        let path = [];
        while ( true ) {
            let peekToken = this.peekToken();
            switch ( peekToken.type ) {
                case PlTokenType.VARIABLE: {
                    const variable = this.pVariable();
                    if ( variable == null ) {
                        return null;
                    }
                    path.push( variable );
                    break;
                }
                case PlTokenType.DOT: {
                    this.nextToken();

                    let spanToken = peekToken;
                    const nextToken = this.peekToken();
                    if ( nextToken.type == PlTokenType.DOT ) {
                        this.nextToken();
                        spanToken = CreateSpanToken( peekToken, nextToken );
                    }
                    path.push( new ASTVariable( [ spanToken ], spanToken.content ) );
                    break;
                }
                default: {
                    this.newProblem( peekToken, "ET0036" );
                    return null;
                }
            }

            let breakSwitch = false;
            peekToken = this.peekToken();
            switch ( peekToken.type ) {
                case PlTokenType.DIV: {
                    tokens.push( this.nextToken() );
                    break;
                }
                case PlTokenType.AS:
                case PlTokenType.SELECT:
                case PlTokenType.LF:
                case PlTokenType.EOF: {
                    breakSwitch = true;
                    break;
                }
                default: {
                    this.newProblemAt( path[path.length - 1].getSpanToken(), "ET0037", "after" );
                    return null;
                }
            }

            if ( breakSwitch ) {
                break;
            }
        }
        return [ path, tokens ];
    }
}
