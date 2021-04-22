import {PlFile} from "../../inout/file";
import PlToken, {NewPlToken, PlTokenType} from "./token";
import {NewFileInfo, PlFileInfo} from "./info";
import {isalpha, isalphanum, isblank, iscap, isnum, isvariablerest, isws} from "../../extension/types";
import {NewPlProblem, PlProblem} from "../../problem/problem";
import {PlProblemCode} from "../../problem/codes";


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

    constructor(file: PlFile) {
        this.filename = file.filename;
        this.content = file.content;
        this.contentSize = this.content.length;

        this.charPointer = 0;
        this.currentRow = 0;
        this.currentCol = 0;

        this.problems = [];
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

    nextToken(): PlToken {
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
        if (isnum(c)) {
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
                for (const pair of [["impl", PlTokenType.IMPL], ["import", PlTokenType.IMPORT], ["if", PlTokenType.IF], ["in", PlTokenType.IN]]) {
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
                for (const pair of [["true", PlTokenType.BOOLEAN]]) {
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
                for (const pair of [["or", PlTokenType.OR]]) {
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
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                if (this.isEOF() || this.currentChar() === '\n') {
                    // error
                    return this.newErrorToken("LE0002", NewFileInfo(this.currentRow, oldCol + 1, 1, this.filename));
                }
                c = this.currentChar();
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
                        default: {
                            return this.newErrorToken("LE0003", NewFileInfo(this.currentRow, this.currentCol + 1, 2, this.filename), c);
                        }
                    }
                    this.advancePointer();
                    c = this.currentChar();
                }
            } while (c !== '"');
            this.advancePointer();
            return NewPlToken(PlTokenType.STR, content.substring(1, content.length), this.currentFileInfo(this.currentCol - oldCol));
        }

        // data types
        if (iscap(c)) {
            // check datatypes
            switch (c) {
                case "I": {
                    const token = this.testNextKeyword("Int", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "S": {
                    const token = this.testNextKeyword("Str", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "N": {
                    const token = this.testNextKeyword("Null", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "L": {
                    const token = this.testNextKeyword("List", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "D": {
                    const token = this.testNextKeyword("Dict", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "F": {
                    const token = this.testNextKeyword("Func", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
                case "T": {
                    const token = this.testNextKeyword("Type", PlTokenType.TYPE);
                    if (token) {
                        return token;
                    }
                    break;
                }
            }
        }

        // variables
        if (isalpha(c) || c === '_') {
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                c = this.currentChar();
            } while (!this.isEOF() && isvariablerest(c));
            return NewPlToken(PlTokenType.VARIABLE, content, this.currentFileInfo(this.currentCol - oldCol));
        }

        // special variables
        if (c == '@') {
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                c = this.currentChar();
            } while (!this.isEOF() && (isvariablerest(c) || c == '+' || c == '-' || c == '*' || c == '/'));
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
