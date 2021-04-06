import {NewPlProblem, PlProblem} from "../../problem/problem";
import {Lexer} from "../lexing";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTCall,
    ASTClosure,
    ASTContinue,
    ASTDict,
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
    ASTVariable,
    ASTWhile
} from "./ast";
import PlToken, {PlTokenType} from "../lexing/token";
import {PlProblemCode} from "../../problem/codes";


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

    constructor(lexer: Lexer) {
        this.lexer = lexer;

        this.cacheToken = [];
        this.problems = [];
    }

    // implementations

    getProblems(): PlProblem[] {
        return [...this.problems, ...this.lexer.getProblems()];
    }

    parseOnce(): ASTStatement | null {
        return this.pStatement();
    }

    parseAll(): ASTProgram {
        let statements = [];
        while (true) {
            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.EOF) {
                break;
            }

            const statement = this.parseOnce();
            if (statement == null) {
                return [];
            }
            statements.push(statement);
        }
        return statements;
    }

    // helper methods

    getToken(): PlToken {
        if (this.cacheToken.length != 0) {
            return this.cacheToken.pop();
        }
        return this.lexer.nextToken();
    }

    nextToken(): PlToken | null {
        // do not report null errors, as it is handled in lexer already
        const token = this.getToken();
        if (token.type == PlTokenType.ERR) {
            return null;
        }
        return token;
    }

    peekToken(): PlToken | null {
        const token = this.getToken();
        this.cacheToken.push(token);
        if (token.type == PlTokenType.ERR) {
            return null;
        }
        return token;
    }

    expectedPeekToken(expected: PlTokenType, code: PlProblemCode, ...args: string[]): PlToken | null {
        const peekToken = this.peekToken();
        if (peekToken.type != expected) {
            this.problems.push(NewPlProblem(code, peekToken.info, ...args));
            return null;
        }
        return this.nextToken();
    }

    peekMatch(types: PlTokenType[]) {
        const peekToken = this.peekToken();
        for (const type of types) {
            if (peekToken.type == type) {
                return true;
            }
        }
        return false;
    }

    newProblem(token: PlToken, code: PlProblemCode, ...args: string[]) {
        this.problems.push(NewPlProblem(code, token.info, ...args));
        return this;
    }

    // recursive parser is here
    // a null return means error, check this.problems for any problems

    // always start a pMethod with the token pointer before the expected token
    pStatement(): ASTStatement | null {
        // try to parse a statement
        const leadingToken = this.peekToken();
        if (leadingToken == null) {
            return null;
        }

        let statement;
        switch (leadingToken.type) {
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
            default:
                statement = this.pExpression();
                break;
        }

        const peekToken = this.peekToken();
        if (peekToken.type != PlTokenType.LF) {
            const ppToken = this.peekToken();
            if (ppToken.type != PlTokenType.EOF) {
                this.newProblem(peekToken, "ET0001");
                return null;
            }
        } else {
            this.nextToken();
        }
        // if (this.expectedPeekToken(PlTokenType.LF, "ET0001") == null) {
        //     return null;
        // }
        return statement;
    }

    // these all expect the first token being correct

    pBlock(): ASTBlock | null {
        let tokens = [this.nextToken()];
        let statements = [];
        while (true) {
            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.RBRACE) {
                break;
            }
            if (peekToken.type == PlTokenType.EOF) {
                this.newProblem(tokens[0], "CE0001");
                return null;
            }

            const statement = this.pStatement();
            if (statement == null) {
                return null;
            }
            statements.push(statement);
        }
        tokens.push(this.nextToken());

        return new ASTBlock(tokens, statements);
    }

    pFunction(): ASTFunction | null {
        return null;
    }

    pImpl(): ASTImpl | null {
        return null;
    }

    pImport(): ASTImport | null {
        return null;
    }

    pExport(): ASTExport | null {
        return null;
    }

    pReturn(): ASTReturn | null {
        return null;
    }

    pBreak(): ASTBlock | null {
        return null;
    }

    pContinue(): ASTContinue | null {
        return null;
    }

    pIf(): ASTIf | null {
        return null;
    }

    pEach(): ASTEach | null {
        return null;
    }

    pLoop(): ASTLoop | null {
        return null;
    }

    pWhile(): ASTWhile | null {
        return null;
    }

    pFor(): ASTFor | null {
        return null;
    }

    pMatch(): ASTMatch | null {
        return null;
    }


    // expressions

    pExpression(): ASTExpression | null {
        return this.pAssign();
    }

    pAssign(): ASTAssign | ASTExpression | null {
        const call = this.pLogical();
        if (call == null)
            return null;

        const peekToken = this.peekToken();
        if (peekToken.type == PlTokenType.ASGN) {
            if (!(call instanceof ASTDot)) {
                this.newProblem(call.getSpanToken(), "ET0002");
                return null;
            }

            this.nextToken();
            const pre = call.left;
            const variable = call.right;
            // is assignment
            const value = this.pExpression();
            if (value == null) {
                return null;
            }
            return new ASTAssign([peekToken], pre, variable, value);
        }

        return call;
    }

    pLogical(): ASTExpression | null {
        let compare = this.pCompare();
        if (compare == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.AND, PlTokenType.OR])) {
            const token = this.nextToken();
            const right = this.pCompare();
            if (right == null) {
                return null;
            }
            compare = new ASTBinary([token], compare, right, token);
        }

        return compare;
    }

    pCompare(): ASTExpression | null {
        let plus = this.pPlus();
        if (plus == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.GT, PlTokenType.GTE, PlTokenType.LT, PlTokenType.LTE, PlTokenType.EQ, PlTokenType.NEQ])) {
            const token = this.nextToken();
            const right = this.pPlus();
            if (right == null) {
                return null;
            }
            plus = new ASTBinary([token], plus, right, token);
        }

        return plus;
    }

    pPlus(): ASTExpression | null {
        let mult = this.pMult();
        if (mult == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.ADD, PlTokenType.SUB])) {
            const token = this.nextToken();
            const right = this.pMult();
            if (right == null) {
                return null;
            }
            mult = new ASTBinary([token], mult, right, token);
        }

        return mult;

    }

    pMult(): ASTExpression | null {
        let mult = this.pMult();
        if (mult == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.ADD, PlTokenType.SUB])) {
            const token = this.nextToken();
            const right = this.pMult();
            if (right == null) {
                return null;
            }
            mult = new ASTBinary([token], mult, right, token);
        }

        return mult;
    }

    pPrefix(): ASTExpression | null {
        return null;

    }

    pPostfix(): ASTExpression | null {
        return null;

    }

    pCall(): ASTCall | ASTDot | ASTExpression | null {
        return null;

    }

    // too much stuff here
    pPrimary(): ASTExpression | null {
        return null;

    }

    pClosure(): ASTClosure | null {
        return null;

    }

    pVariable(): ASTVariable | null {
        return null;

    }

    pNumber(): ASTNumber | null {
        return null;

    }

    pBoolean(): ASTBoolean | null {
        return null;

    }

    pNull(): ASTNull | null {
        return null;

    }

    pString(): ASTString | null {
        return null;

    }

    pList(): ASTList | null {
        return null;

    }

    pDict(): ASTDict | null {
        return null;

    }

    pTypes(): ASTType | null {
        return null;

    }

    pGroup(): ASTExpression | null {
        return null;

    }
}
