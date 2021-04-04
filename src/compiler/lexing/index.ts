import { PlFile } from "../../inout/file";
import PlToken, { NewPlToken, PlTokenType } from "./token";
import { EmptyFileInfo, NewFileInfo } from "./info";
import { isnum, isws } from "../../extension/types";



interface Lexer {
    nextToken(): PlToken;

    parseAll(): PlToken[];
}


class PlLexer implements Lexer {
    private readonly filename: string;
    private readonly content: string;
    private readonly contentSize: number;

    private charPointer: number;
    private currentRow: number;
    private currentCol: number;

    constructor( file: PlFile ) {
        this.filename = file.filename;
        this.content = file.content;
        this.contentSize = this.content.length;

        this.charPointer = 0;
        this.currentRow = 0;
        this.currentCol = 0;
    }

    currentChar() {
        return this.content[this.charPointer];
    }

    nextChar() {
        return this.content[this.charPointer + 1];
    }

    currentFileInfo( length: number ) {
        return NewFileInfo( this.currentRow, this.currentCol, length, this.filename );
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

    testNextChars( chars: string, tokenType: PlTokenType ): null | PlToken {
        const size = chars.length;
        let i;
        for ( i = 0; i < size; ++i ) {
            if ( !this.isEOF() ) {
                let c = this.currentChar();
                if ( c === chars[i] ) {
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
        return NewPlToken( tokenType, chars, this.currentFileInfo( i ) );
    }

    nextToken(): PlToken {
        if ( this.charPointer >= this.contentSize ) {
            return NewPlToken( PlTokenType.EOF, "", this.eofFileInfo() );
        }

        while ( isws( this.currentChar() ) ) {
            this.advancePointer();
        }

        if ( this.charPointer >= this.contentSize ) {
            return NewPlToken( PlTokenType.EOF, "", this.eofFileInfo() );
        }

        let c = this.currentChar();
        // is number
        if ( isnum( c ) ) {
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                this.advancePointer();
                c = this.currentChar();
            } while ( isnum( c ) && !this.isEOF() );

            if (!this.isEOF() && !this.isNextEOF() && c === '.' && isnum(this.nextChar())) {
                // parse dot
                do {
                    content += c;
                    this.advancePointer();
                    c = this.currentChar();
                } while ( isnum( c ) && !this.isEOF() );
            }

            return NewPlToken( PlTokenType.NUMBER, content, this.currentFileInfo( this.currentCol - oldCol ) );
        }

        // is symbol
        const singleSymbolMap = {
            '.': PlTokenType.DOT,
            '{': PlTokenType.LBRACE,
            '}': PlTokenType.RBRACE,
            '(': PlTokenType.LPAREN,
            ')': PlTokenType.RPAREN,
            ',': PlTokenType.RPAREN,
            ':': PlTokenType.COLON,
            ';': PlTokenType.SEMICOLON,
        }
        if ( singleSymbolMap.hasOwnProperty( c ) ) {
            // parse
            const t = NewPlToken( singleSymbolMap[c], c, this.currentFileInfo( 1 ) );
            this.advancePointer();
            return t;
        }


        // is keyword or operator
        switch ( c ) {
            // operators
            case '+': {
                let token = this.testNextChars( "++", PlTokenType.INC );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.ADD, c, this.currentFileInfo( 1 ) )
            }
            case '-': {
                let token = this.testNextChars( "--", PlTokenType.DEC );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.SUB, c, this.currentFileInfo( 1 ) )
            }
            case '*': {
                this.advancePointer();
                return NewPlToken(PlTokenType.MUL, c, this.currentFileInfo(1));
            }
            case '/': {
                let token = this.testNextChars( "/=", PlTokenType.NEQ );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.DIV, c, this.currentFileInfo( 1 ) )
            }
            case '=': {
                let token = this.testNextChars( "==", PlTokenType.EQ );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.ASGN, c, this.currentFileInfo( 1 ) )
            }
            case '>': {
                let token = this.testNextChars( ">=", PlTokenType.GTE );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.GT, c, this.currentFileInfo( 1 ) )
            }
            case '<': {
                let token = this.testNextChars( "<=", PlTokenType.LTE );
                if ( token ) {
                    return token;
                }
                this.advancePointer();
                return NewPlToken( PlTokenType.LT, c, this.currentFileInfo( 1 ) )
            }


            case '\n': {
                this.advancePointer();
                const token = NewPlToken( PlTokenType.LF, '\n', this.currentFileInfo( 1 ) );
                this.advanceRow();
                return token;
            }
            default: {
                // parse variables

                break;
            }
        }

        return NewPlToken( PlTokenType.ERR, c, this.errFileInfo() );
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
}

export default PlLexer;
