import {NewPlProblem, PlProblem} from "../../problem/problem";
import {Lexer} from "../lexing";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTBreak,
    ASTCall,
    ASTClosure,
    ASTContinue,
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
            this.clearLF();
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

    tryPeekToken(expected: PlTokenType, code: PlProblemCode, errorToken: PlToken | null, ...args: string[]): PlToken | null {
        const peekToken = this.peekToken();
        if (peekToken.type != expected) {
            this.problems.push(NewPlProblem(code, errorToken == null ? peekToken.info : errorToken.info, ...args));
            return null;
        }
        return peekToken;
    }


    tryPeekTokens(expects: PlTokenType[], code: PlProblemCode, errorToken: PlToken | null, ...args: string[]): PlToken | null {
        const peekToken = this.peekToken();
        let found = false;
        for (const type of expects) {
            if (peekToken.type == type) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.problems.push(NewPlProblem(code, errorToken == null ? peekToken.info : errorToken.info, ...args));
            return null;
        }
        return peekToken;
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
            if (peekToken.type != PlTokenType.EOF) {
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
            this.clearLF();
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
        let tokens = [this.nextToken()];
        const nameToken = this.tryPeekToken(PlTokenType.VARIABLE, "ET0013", null);
        if (nameToken == null) {
            return null;
        }
        const name = this.pVariable();
        if (this.expectedPeekToken(nameToken, PlTokenType.LPAREN, "ET0014") == null) {
            return null;
        }
        // parse parameters
        const param = this.pParam();
        if (param == null) {
            return null;
        }

        const lastParen = param[1][param[1].length - 1];

        if (this.tryPeekToken(PlTokenType.LBRACE, "ET0017", lastParen) == null) {
            return null;
        }

        const block = this.pBlock();
        if (block == null) {
            return null;
        }

        return new ASTFunction([...tokens, ...param[1]], name, param[0], block);
    }

    pImpl(): ASTImpl | null {
        return null;
    }

    pImport(): ASTImport | null {
        return null;
    }

    pExport(): ASTExport | null {
        const token = this.nextToken();
        if (this.peekMatch([PlTokenType.LF, PlTokenType.EOF])) {
            this.newProblem(token, "ET0020");
            return null;
        }
        const value = this.pExpression();
        if (value == null) {
            return null;
        }
        return new ASTExport([token], value);
    }

    pReturn(): ASTReturn | null {
        const token = [this.nextToken()];
        if (this.peekToken().type == PlTokenType.LF) {
            return new ASTReturn(token);
        }
        const value = this.pExpression();
        if (value == null) {
            return null;
        }
        return new ASTReturn(token, value);
    }

    pBreak(): ASTBreak | null {
        return new ASTBreak([this.nextToken()]);
    }

    pContinue(): ASTContinue | null {
        return new ASTContinue([this.nextToken()]);
    }

    pIf(): ASTIf | null {
        let tokens = [this.nextToken()];
        let conditions = [];
        let blocks = [];

        let condition = this.pExpression();
        if (condition == null) {
            return null;
        }
        conditions.push(condition);
        if (this.tryPeekToken(PlTokenType.LBRACE, "ET0021", condition.getSpanToken()) == null) {
            return null;
        }

        let block = this.pBlock();
        if (block == null) {
            return null;
        }

        while (true) {
            const token = this.peekToken();
            if (token.type != PlTokenType.ELIF) {
                break;
            }
            tokens.push(token);
            this.nextToken();

            condition = this.pExpression();
            if (condition == null) {
                return null;
            }
            conditions.push(condition);
            if (this.tryPeekToken(PlTokenType.LBRACE, "ET0022", condition.getSpanToken()) == null) {
                return null;
            }
            block = this.pBlock();
            if (block == null) {
                return null;
            }
            blocks.push(block);
        }

        let other = null;
        const token = this.peekToken();
        if (token.type == PlTokenType.ELSE) {
            tokens.push(token);
            this.nextToken();

            if (this.tryPeekToken(PlTokenType.LBRACE, "ET0023", token) == null) {
                return null;
            }
            other = this.pBlock();
            if (other == null) {
                return null;
            }
        }

        return new ASTIf(tokens, conditions, blocks, other);
    }

    pEach(): ASTEach | null {
        return null;
    }

    pLoop(): ASTLoop | null {
        const tokens = [this.nextToken()];
        const peekToken = this.peekToken();
        let expression = null;
        if (peekToken.type != PlTokenType.LBRACE) {
            expression = this.pExpression();
        }
        const eToken = expression == null ? tokens[0] : expression.getSpanToken();
        if (this.tryPeekToken(PlTokenType.LBRACE, "ET0018", eToken) == null) {
            return null;
        }
        const block = this.pBlock();
        if (block == null) {
            return null;
        }

        return new ASTLoop(tokens, block, expression);
    }

    pWhile(): ASTWhile | null {
        const tokens = [this.nextToken()];
        const condition = this.pExpression();
        if (condition == null) {
            return null;
        }

        if (this.tryPeekToken(PlTokenType.LBRACE, "ET0019", condition.getSpanToken()) == null) {
            return null;
        }

        const block = this.pBlock();
        if (block == null) {
            return null;
        }

        return new ASTWhile(tokens, condition, block);
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
                pre = left.left;
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

    pCall(): ASTExpression | null {
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
                if (this.tryPeekToken(PlTokenType.VARIABLE, "ET0003", null) == null) {
                    return null;
                }
                const right = this.pVariable();
                if (right == null) {
                    return null;
                }
                left = new ASTDot([peekToken], left, peekToken, right);
                continue;
            }
            break;
        }
        return left;
    }

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

        const result = this.pArgs();
        if (result == null) {
            return null;
        }
        tokens.push(...result[1]);
        return new ASTList(tokens, result[0]);
    }

    pDict(): ASTDict | null {
        let tokens = [this.nextToken()];
        let peek = this.expectedPeekToken(tokens[0], PlTokenType.LPAREN, "ET0010");
        if (peek == null) {
            return null;
        }
        tokens.push(peek);

        let keys = [];
        let values = [];
        // parse arguments
        while (true) {
            this.clearLF();
            const token = this.peekToken();
            if (token.type == PlTokenType.RPAREN) {
                break;
            }
            // need to bind this for some damn reason or this is not defined
            const result = this.pPair();
            if (result == null) {
                return null;
            }

            this.clearLF();

            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.COMMA) {
                this.nextToken();
            } else if (peekToken.type != PlTokenType.RPAREN) {
                this.newProblem(result[2].getSpanToken(), peekToken.type == PlTokenType.EOF ? "ET0010" : "ET0012");
                return null;
            }
            keys.push(result[0]);
            tokens.push(result[1])
            values.push(result[2]);
        }
        // push the last rparen
        tokens.push(this.nextToken());

        return new ASTDict(tokens, keys, values);
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
        if (this.expectedPeekToken(left, PlTokenType.RPAREN, "CE0002") == null) {
            return null;
        }
        return expression;
    }


    // this is only used for dict() parsing
    pPair(): [ASTDictKey, PlToken, ASTExpression] | null {
        const token = this.tryPeekTokens([PlTokenType.VARIABLE, PlTokenType.NUMBER], "ET0009", null);
        if (token == null) {
            return null;
        }
        const key = this.pPrimary();
        if (key == null) {
            return null;
        }
        const colon = this.expectedPeekToken(token, PlTokenType.COLON, "ET0011");
        if (colon == null) {
            return null;
        }
        const value = this.pExpression();
        if (value == null) {
            return null;
        }
        return [key as ASTDictKey, colon, value];
    }

    // this is only used for call args and list item
    pArgs(
        commaCode: PlProblemCode = "ET0006",
        endTokenCode: PlProblemCode = "ET0007",
        endToken: PlTokenType = PlTokenType.RPAREN
    ): [ASTExpression[], PlToken[]] | null {
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
            } else if (peekToken.type != endToken) {
                this.newProblem(expression.getSpanToken(), peekToken.type == PlTokenType.EOF ? endTokenCode : commaCode);
                return null;
            }
            tokens.push(peekToken);
            expressions.push(expression);
        }
        tokens.push(this.nextToken());
        return [expressions, tokens];
    }

    // this is used for function param parsing
    pParam(): [ASTVariable[], PlToken[]] | null {
        let variables = [];
        let tokens = [];
        while (true) {
            this.clearLF();
            const token = this.peekToken();
            if (token.type == PlTokenType.RPAREN) {
                break;
            }
            const variableToken = this.tryPeekToken(PlTokenType.VARIABLE, "ET0015", null);
            if (variableToken == null) {
                return null;
            }
            const variable = this.pVariable();
            this.clearLF();

            const peekToken = this.peekToken();
            if (peekToken.type == PlTokenType.COMMA) {
                this.nextToken();
            } else if (peekToken.type != PlTokenType.RPAREN) {
                this.newProblem(variableToken, "ET0016");
                return null;
            }
            tokens.push(peekToken);
            variables.push(variable);
        }
        tokens.push(this.nextToken());
        return [variables, tokens];
    }
}
