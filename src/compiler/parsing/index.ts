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
    ASTUnary,
    ASTVariable,
    ASTWhile
} from "./ast";
import PlToken, {PlTokenType} from "../lexing/token";
import {PlProblemCode} from "../../problem/codes";

class ErrTokenException {

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
        try {
            return this.pStatement();
        } catch (e) {
            if (e instanceof ErrTokenException) {
                return null;
            }
            // normal error
            this.newProblem(this.getToken(), "DE0001");
            return null;
        }
    }

    parseAll(): ASTProgram {
        let statements = [];
        while (true) {
            // check for end of file
            try {
                const peekToken = this.peekToken();
                if (peekToken.type == PlTokenType.EOF) {
                    break;
                }
            } catch (e) {
                // the next token is ERR, so we return nothing for error
                return [];
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
            throw new ErrTokenException();
        }
        return token;
    }

    peekToken(): PlToken | null {
        const token = this.getToken();
        this.cacheToken.push(token);
        if (token.type == PlTokenType.ERR) {
            throw new ErrTokenException();
        }
        return token;
    }

    expectedPeekToken(token: PlToken, expected: PlTokenType, code: PlProblemCode, ...args: string[]): PlToken | null {
        const peekToken = this.peekToken();
        if (peekToken.type != expected) {
            this.problems.push(NewPlProblem(code, token == null ? peekToken.info : token.info, ...args));
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

    clearLF() {
        while (true) {
            const token = this.peekToken();
            if (token.type == PlTokenType.LF) {
                this.nextToken();
            } else {
                break;
            }
        }
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

        let statement: ASTStatement;
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
        if (statement == null) {
            return null;
        }

        const peekToken = this.peekToken();
        if (peekToken.type != PlTokenType.LF) {
            const ppToken = this.peekToken();
            if (ppToken.type != PlTokenType.EOF) {
                this.newProblem(statement.getSpanToken(), "ET0001");
                return null;
            }
        } else {
            this.nextToken();
        }
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
        const left = this.pLogical();
        if (left == null)
            return null;

        const peekToken = this.peekToken();
        if (peekToken.type == PlTokenType.ASGN) {

            let pre;
            let variable;

            if (left instanceof ASTVariable) {
                pre = null;
                variable = left;
            } else if (left instanceof ASTDot) {
                let right = left;
                while (right.right instanceof ASTDot) {
                    right = right.right;
                }
                pre = left; // TODO: think about how to sort out the left side
                variable = right.right;
            } else {
                this.newProblem(left.getSpanToken(), "ET0002");
                return null;
            }

            this.nextToken();
            const value = this.pExpression();
            if (value == null) {
                return null;
            }
            return new ASTAssign([peekToken], pre, variable, value);
        }

        return left;
    }

    pLogical(): ASTExpression | null {
        let left = this.pCompare();
        if (left == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.AND, PlTokenType.OR])) {
            const token = this.nextToken();
            const right = this.pCompare();
            if (right == null) {
                return null;
            }
            left = new ASTBinary([token], left, right, token);
        }

        return left;
    }

    pCompare(): ASTExpression | null {
        let left = this.pPlus();
        if (left == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.GT, PlTokenType.GTE, PlTokenType.LT, PlTokenType.LTE, PlTokenType.EQ, PlTokenType.NEQ])) {
            const token = this.nextToken();
            const right = this.pPlus();
            if (right == null) {
                return null;
            }
            left = new ASTBinary([token], left, right, token);
        }

        return left;
    }

    pPlus(): ASTExpression | null {
        let left = this.pMult();
        if (left == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.ADD, PlTokenType.SUB])) {
            const token = this.nextToken();
            const right = this.pMult();
            if (right == null) {
                return null;
            }
            left = new ASTBinary([token], left, right, token);
        }

        return left;

    }

    pMult(): ASTExpression | null {
        let left = this.pPrefix();
        if (left == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.MUL, PlTokenType.DIV])) {
            const token = this.nextToken();
            const right = this.pMult();
            if (right == null) {
                return null;
            }
            left = new ASTBinary([token], left, right, token);
        }

        return left;
    }

    pPrefix(): ASTExpression | null {
        if (this.peekMatch([PlTokenType.NOT, PlTokenType.ADD, PlTokenType.SUB])) {
            const token = this.nextToken();
            const value = this.pPrefix();
            return new ASTUnary([token], token, value);
        }
        return this.pPostfix();
    }

    pPostfix(): ASTExpression | null {
        let left = this.pCall();
        if (left == null) {
            return null;
        }

        while (this.peekMatch([PlTokenType.INC, PlTokenType.DEC])) {
            if (!(left instanceof ASTVariable) && !(left instanceof ASTUnary)) {
                this.newProblem(left.getSpanToken(), "ET0005");
                return null;
            }
            const token = this.nextToken();
            left = new ASTUnary([token], token, left);
        }
        return left;
    }

    pCall(): ASTCall | ASTDot | ASTExpression | null {
        let left = this.pPrimary();
        if (left == null) {
            return null;
        }

        while (true) {
            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.LPAREN) {
                this.nextToken();
                const args = this.pArgs("ET0008");
                if (args == null) {
                    return null;
                }
                left = new ASTCall([peekToken, ...args[1]], left, args[0]);
                continue;
            }
            if (peekToken.type == PlTokenType.DOT) {
                this.nextToken();
                const peek = this.peekToken();
                if (peek.type != PlTokenType.VARIABLE) {
                    this.newProblem(peek, "ET0003");
                    return null;
                }
                const right = this.pVariable();
                if (right == null) {
                    return null;
                }
                // if (!(right instanceof ASTVariable) && !(right instanceof ASTDot)) {
                //     this.newProblem(right.getSpanToken(), "ET0003");
                //     return null;
                // }
                left = new ASTDot([peekToken], left, peekToken, right);
                continue;
            }
            break;
        }
        return left;
    }

    // too much stuff here
    pPrimary(): ASTExpression | null {
        const token = this.peekToken();
        switch (token.type) {
            case PlTokenType.LPAREN:
                return this.pGroup();
            case PlTokenType.VARIABLE:
                return this.pVariable();
            case PlTokenType.NUMBER:
                return this.pNumber();
            case PlTokenType.STR:
                return this.pString();
            case PlTokenType.BOOLEAN:
                return this.pBoolean();
            case PlTokenType.NULL:
                return this.pNull();
            case PlTokenType.TYPE:
                return this.pTypes();
            case PlTokenType.LIST:
                return this.pList();
            case PlTokenType.DICT:
                return this.pDict();
        }

        this.newProblem(token, "ET0004", token.content);
        return null;
    }

    pClosure(): ASTClosure | null {
        return null;

    }

    pVariable(): ASTVariable | null {
        const token = this.nextToken();
        return new ASTVariable([token], token.content);
    }

    pNumber(): ASTNumber | null {
        const token = this.nextToken();
        return new ASTNumber([token], +token.content);
    }

    pBoolean(): ASTBoolean | null {
        const token = this.nextToken();
        return new ASTBoolean([token], !!token.content);
    }

    pNull(): ASTNull | null {
        const token = this.nextToken();
        return new ASTNull([token]);
    }

    pString(): ASTString | null {
        const token = this.nextToken();
        return new ASTString([token], token.content);
    }

    pList(): ASTList | null {
        let tokens = [this.nextToken()];
        let peek = this.expectedPeekToken(tokens[0], PlTokenType.LPAREN, "ET0007");
        if (peek == null) {
            return null;
        }
        tokens.push(peek);

        const result =this.pArgs();
        if (result == null) {
            return null;
        }
        tokens.push(...result[1]);
        return new ASTList(tokens, result[0]);
    }

    pDict(): ASTDict | null {
        return null;
    }

    pTypes(): ASTType | null {
        const token = this.nextToken();
        return new ASTType([token], token.content);
    }

    pGroup(): ASTExpression | null {
        const left = this.nextToken();
        const expression = this.pExpression();
        if (expression == null) {
            return null;
        }
        if (this.expectedPeekToken(left,PlTokenType.RPAREN, "CE0002") == null) {
            return null;
        }
        this.nextToken();
        return expression;
    }

    pArgs(commaCode: PlProblemCode = "ET0006", endTokenCode: PlProblemCode = "ET0007", endToken: PlTokenType = PlTokenType.RPAREN): [ASTExpression[], PlToken[]] | null {
        let expressions = [];
        let tokens = [];
        while (true) {
            this.clearLF();
            const token = this.peekToken();
            if (token.type == endToken) {
                break;
            }
            const expression = this.pExpression();
            if (expression == null) {
                return null;
            }

            this.clearLF();

            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.COMMA) {
                this.nextToken();
            } else if (peekToken.type != PlTokenType.LF && peekToken.type != endToken) {
                this.newProblem(expression.getSpanToken(), peekToken.type == PlTokenType.EOF ? endTokenCode :commaCode);
                return null;
            }
            tokens.push(peekToken);
            expressions.push(expression);
        }
        tokens.push(this.nextToken());
        return [expressions, tokens];
    }
}
