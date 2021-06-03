import { PlFile } from "../../inout/file";
import PlToken, { NewPlToken, PlTokenType } from "./token";
import { NewFileInfo, PlFileInfo } from "./info";
import { isalpha, isblank, isnum, isvariablerest } from "../../extension/types";
import { NewPlProblem, PlProblem } from "../../problem/problem";
import { PlProblemCode } from "../../problem/codes";


export interface Lexer {
    readonly filename: string;

    nextToken(): PlToken;

    parseAll(): PlToken[];

    getProblems(): PlProblem[];
}


class PlLexer implements Lexer {
    readonly filename: string;
    private readonly content: string;
    private readonly contentSize: number;

    private charPointer: number;
    private currentRow: number;
    private currentCol: number;

    private problems: PlProblem[];

    private buffer: PlToken[];

    constructor(file: PlFile) {
        this.filename = file.filename;
        this.content = file.content;
        this.contentSize = this.content.length;

        this.charPointer = 0;
        this.currentRow = 0;
        this.currentCol = 0;

        this.problems = [];

        this.buffer = [];
    }

    currentChar() {
        return this.content[this.charPointer];
    }

    nextChar() {
        return this.content[this.charPointer + 1];
    }

    currentFileInfo(length: number) {
        return NewFileInfo(this.currentRow, this.currentCol, length, this.filename);
    }

    eofFileInfo() {
        return NewFileInfo(this.currentRow, this.currentCol + 1, 1, this.filename);
    }

    errFileInfo() {
        return NewFileInfo(this.currentRow, this.currentCol + 1, 1, this.filename);
    }

    advancePointer() {
        ++this.currentCol;
        ++this.charPointer;
        return this.currentChar();
    }

    advanceRow() {
        ++this.currentRow;
        this.currentCol = 0;
    }

    isEOF() {
        return this.charPointer >= this.contentSize;
    }

    isNextEOF() {
        return this.charPointer + 1 >= this.contentSize;
    }

    testNextChars(chars: string, tokenType: PlTokenType): null | PlToken {
        const size = chars.length;
        let i;
        for (i = 0; i < size; ++i) {
            if (!this.isEOF()) {
                let c = this.currentChar();
                if (c === chars[i]) {
                    this.advancePointer();
                    continue;
                }
            }

            // doesnt match
            this.currentCol -= i;
            this.charPointer -= i;
            return null;
        }
        // matched fully
        return NewPlToken(tokenType, chars, this.currentFileInfo(i));
    }

    testNextKeyword(keyword: string, tokenType: PlTokenType): null | PlToken {
        const size = keyword.length;
        let i;
        for (i = 0; i < size; ++i) {
            if (!this.isEOF()) {
                let c = this.currentChar();
                if (c === keyword[i]) {
                    this.advancePointer();
                    continue;
                }
            }

            // doesnt match
            this.currentCol -= i;
            this.charPointer -= i;
            return null;
        }
        if (!this.isEOF() && isvariablerest(this.currentChar())) {
            this.currentCol -= i;
            this.charPointer -= i;
            return null;
        }
        // matched fully
        return NewPlToken(tokenType, keyword, this.currentFileInfo(i));
    }

    newErrorToken(code: PlProblemCode, info: PlFileInfo, ...args: string[]): PlToken {
        this.problems.push(NewPlProblem(code, info, ...args));
        return NewPlToken(PlTokenType.ERR, "", info);
    }

    addBuffer(token: PlToken) {
        this.buffer.push(token);
    }

    popBuffer(): PlToken {
        return this.buffer.shift();
    }

    haveBuffered(): boolean {
        return this.buffer.length > 0;
    }


    nextToken(consume: boolean = true): PlToken {
        if (consume && this.haveBuffered()) {
            return this.popBuffer();
        }

        if (this.isEOF()) {
            return NewPlToken(PlTokenType.EOF, "eof", this.eofFileInfo());
        }

        while (isblank(this.currentChar())) {
            this.advancePointer();
        }

        if (this.isEOF()) {
            return NewPlToken(PlTokenType.EOF, "eof", this.eofFileInfo());
        }

        // is comment
        while (!this.isEOF() && this.currentChar() === '#') {
            do {
                this.advancePointer();
            } while (!this.isEOF() && this.currentChar() !== '\n');
        }

        if (this.isEOF()) {
            return NewPlToken(PlTokenType.EOF, "eof", this.eofFileInfo());
        }

        let c = this.currentChar();
        // is number
        if (isnum(c)) { // TODO: make exponents
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                c = this.currentChar();
            } while (isnum(c) && !this.isEOF());

            if (!this.isEOF() && !this.isNextEOF() && c === '.' && isnum(this.nextChar())) {
                // parse dot
                do {
                    content += c;
                    this.advancePointer();
                    c = this.currentChar();
                } while (isnum(c) && !this.isEOF());
            }

            return NewPlToken(PlTokenType.NUMBER, content, this.currentFileInfo(this.currentCol - oldCol));
        }

        // is symbol
        const singleSymbolMap = {
            '.': PlTokenType.DOT,
            '{': PlTokenType.LBRACE,
            '}': PlTokenType.RBRACE,
            '(': PlTokenType.LPAREN,
            ')': PlTokenType.RPAREN,
            ',': PlTokenType.COMMA,
            ':': PlTokenType.COLON,
            ';': PlTokenType.SEMICOLON,
        }
        if (singleSymbolMap.hasOwnProperty(c)) {
            // parse
            this.advancePointer();
            return NewPlToken(singleSymbolMap[c], c, this.currentFileInfo(1));
        }


        // is keyword or operator
        switch (c) {
            // operators
            case '+': {
                let token = this.testNextChars("++", PlTokenType.INC);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.ADD, c, this.currentFileInfo(1))
            }
            case '-': {
                let token = this.testNextChars("--", PlTokenType.DEC);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.SUB, c, this.currentFileInfo(1))
            }
            case '*': {
                this.advancePointer();
                return NewPlToken(PlTokenType.MUL, c, this.currentFileInfo(1));
            }
            case '/': {
                let token = this.testNextChars("/=", PlTokenType.NEQ);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.DIV, c, this.currentFileInfo(1))
            }
            case '=': {
                let token = this.testNextChars("==", PlTokenType.EQ);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.ASGN, c, this.currentFileInfo(1))
            }
            case '>': {
                let token = this.testNextChars(">=", PlTokenType.GTE);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.GT, c, this.currentFileInfo(1))
            }
            case '<': {
                let token = this.testNextChars("<=", PlTokenType.LTE);
                if (token) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken(PlTokenType.LT, c, this.currentFileInfo(1))
            }

            // keywords
            case 'f': {
                for (const pair of [["func", PlTokenType.FUNC], ["for", PlTokenType.FOR], ["false", PlTokenType.BOOLEAN]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'i': {
                for (const pair of [["impl", PlTokenType.IMPL], ["import", PlTokenType.IMPORT], ["if", PlTokenType.IF]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'a': {
                for (const pair of [["as", PlTokenType.AS], ["and", PlTokenType.AND]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 't': {
                for (const pair of [["true", PlTokenType.BOOLEAN], ["type", PlTokenType.TYPE]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'e': {
                for (const pair of [["export", PlTokenType.EXPORT], ["elif", PlTokenType.ELIF], ["else", PlTokenType.ELSE], ["each", PlTokenType.EACH]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'r': {
                for (const pair of [["return", PlTokenType.RETURN]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'b': {
                for (const pair of [["break", PlTokenType.BREAK]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'c': {
                for (const pair of [["continue", PlTokenType.CONTINUE], ["case", PlTokenType.CASE]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'l': {
                for (const pair of [["loop", PlTokenType.LOOP]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'w': {
                for (const pair of [["while", PlTokenType.WHILE]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'm': {
                for (const pair of [["match", PlTokenType.MATCH]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'd': {
                for (const pair of [["default", PlTokenType.DEFAULT]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'o': {
                for (const pair of [["or", PlTokenType.OR],  ["of", PlTokenType.OF]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 'n': {
                for (const pair of [["not", PlTokenType.NOT], ["null", PlTokenType.NULL]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }
            case 's': {
                for (const pair of [["select", PlTokenType.SELECT]]) {
                    const [str, type] = (pair as [string, PlTokenType]);
                    const token = this.testNextKeyword(str, type);
                    if (token) {
                        return token;
                    }
                }
                break;
            }

            case '\n': {
                this.advancePointer();
                const token = NewPlToken(PlTokenType.LF, '\n', this.currentFileInfo(1));
                this.advanceRow();
                return token;
            }
        }

        // string
        if (c === '"') {
            let content = '';


            // multiline string
            if (this.testNextChars('"""', PlTokenType.STR) != null) {
                const oldRow = this.currentRow;
                const oldCol = this.currentCol;
                while (true) {
                    if (this.isEOF()) {
                        return this.newErrorToken("CE0008", NewFileInfo(oldRow, oldCol, 3, this.filename));
                    }
                    c = this.currentChar();
                    content += c;
                    if (this.testNextChars('"""', PlTokenType.STR) != null) {
                        break;
                    }
                    if (c == '\n') {
                        this.advanceRow();
                        ++this.charPointer;
                    } else {
                        this.advancePointer();
                    }
                }

                let fi;
                if (this.currentRow != oldRow) {
                    fi = this.currentFileInfo(3);
                } else {
                    fi = this.currentFileInfo(this.currentCol - oldCol);
                }
                return NewPlToken(PlTokenType.STR, content.substring(0, content.length - 1), fi);
            }


            // regular string
            this.advancePointer();

            let oldCol = this.currentCol; // first string segment col
            let lastCol = oldCol; // last string segment col

            // initial buffer length
            const lastBuffer = this.buffer.length;
            // inital file info
            const info = this.currentFileInfo(1);
            while (true) {
                if (this.isEOF()) {
                    return this.newErrorToken("LE0002", info);
                }
                c = this.currentChar();
                if (c == '\n') {
                    return this.newErrorToken("LE0002", info);
                }
                if (c === '\\') {
                    this.advancePointer();
                    c = this.currentChar();
                    switch (c) {
                        case 'n': {
                            content += "\n";
                            break;
                        }
                        case 't': {
                            content += '\t';
                            break;
                        }
                        case 'r': {
                            content += '\r';
                            break;
                        }
                        case 'f': {
                            content += '\f';
                            break;
                        }
                        case '"': {
                            content += '"';
                            break;
                        }
                        case '\\': {
                            content += "\\";
                            break;
                        }
                        case '(': {
                            // THIS PART DOES THE STRING CONCATENATION

                            // emit ("a" + str(b) + "c")

                            // emit "a" + str(
                            this.addBuffer(NewPlToken(PlTokenType.STR, content.substring(0, content.length), this.currentFileInfo(this.currentCol - oldCol + 1)) );
                            content = '';

                            this.addBuffer(NewPlToken(PlTokenType.ADD, '+', this.currentFileInfo(1)))
                            this.addBuffer(NewPlToken(PlTokenType.VARIABLE, 'str', this.currentFileInfo(1)));
                            this.addBuffer(NewPlToken(PlTokenType.LPAREN, '(', this.currentFileInfo(1)));

                            this.advancePointer();
                            const lparen = this.currentFileInfo(2); // lparen token info
                            // used for counting parenthesis
                            let lparens = 0;
                            while (true) {
                                const last = this.buffer.length;
                                const token = this.nextToken(false);
                                if (token.type == PlTokenType.ERR) {
                                    return token;
                                }
                                if (token.type === PlTokenType.EOF || token.type == PlTokenType.LF) {
                                    return this.newErrorToken("LE0004", lparen);
                                }

                                // if multiple tokens emitted in buffer, this puts the popped into place
                                if (this.buffer.length - last > 1) {
                                    this.buffer.splice(last, 0, token);
                                } else {  // if only one token emitted - not an another concat
                                    this.addBuffer(token);

                                    // check for lparen and rparen
                                    if (token.type == PlTokenType.LPAREN) {
                                        lparens++;
                                    } else if (token.type === PlTokenType.RPAREN) {
                                        if (lparens == 0) {
                                            break;
                                        }
                                        lparens--;
                                    }
                                }
                            }

                            // emit +
                            this.addBuffer(NewPlToken(PlTokenType.ADD, '+', this.currentFileInfo(1)))

                            lastCol = this.currentCol;
                            continue;
                        }
                        default: {
                            return this.newErrorToken("LE0003", NewFileInfo(this.currentRow, this.currentCol + 1, 2, this.filename), c);
                        }
                    }
                    this.advancePointer();
                    continue;
                }
                content += c;
                if (c == '"') {
                    this.advancePointer();
                    break;
                }
                this.advancePointer();
            }

            // add the final/first string segment
            this.addBuffer(
                NewPlToken(PlTokenType.STR, content.substring(0, content.length - 1), this.currentFileInfo(this.currentCol - lastCol + 1))
            );

            // if there is more than one emitted
            if (this.buffer.length - lastBuffer > 1) {
                // add final )
                this.addBuffer( NewPlToken(PlTokenType.RPAREN, ")", this.currentFileInfo(1)));
                // return/add initial (
                return NewPlToken(PlTokenType.LPAREN, "(", info);
            }

            // return the only one string segment
            return this.buffer.pop();
        }

        // variables
        if (isalpha(c) || c === '_' || c === '@' || c === '$') {
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                c = this.currentChar();
            } while (!this.isEOF() && isvariablerest(c));
            return NewPlToken(PlTokenType.VARIABLE, content, this.currentFileInfo(this.currentCol - oldCol));
        }

        return this.newErrorToken("LE0001", this.errFileInfo(), c);
    }

    parseAll(): PlToken[] {
        let tokens = [];

        while (true) {
            const token = this.nextToken();
            tokens.push(token);
            if (token.type === PlTokenType.EOF || token.type === PlTokenType.ERR) {
                break;
            }
        }

        return tokens;
    }

    getProblems() {
        return this.problems;
    }
}

export default PlLexer;
