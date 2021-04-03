import { PlFile } from "../../inout/file";
import PlToken, { PlTokenType } from "./token";
import { EmptyFileInfo, NewFileInfo } from "./info";

function isws( c ) {
    return c === ' ' || c === '\t';
}

function isnum( c ) {
    return c >= '0' && c <= '9';
}

function tonum( c: string ): number {
    return (c as any) - ('0' as any);
}

class PlLexer {
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
    }

    currentChar(): string {
        return this.content[this.charPointer];
    }

    currentFileInfo( length: number ) {
        return NewFileInfo( this.currentRow, this.currentCol, length, this.filename );
    }

    nextToken(): PlToken {
        if ( this.charPointer >= this.contentSize ) {
            return new PlToken( PlTokenType.ERR, "", this.currentFileInfo( 0 ) );
        }

        while ( isws( this.currentChar() ) ) {
            ++this.currentCol;
            ++this.charPointer;
        }

        let c = this.currentChar();
        // is number
        if ( isnum( c ) ) {
            let content = '';
            const oldCol = this.currentCol;
            do {
                content += c;
                ++this.currentCol;
                ++this.charPointer;
                c = this.currentChar();
            } while ( isnum( c ) );

            return new PlToken( PlTokenType.NUMBER, content, this.currentFileInfo( this.currentCol - oldCol ) );
        }
        // is symbol

        // is keyword
        switch ( c ) {
            case 'f': {

                break;
            }
            case '': {
                break;
            }
            default: {
                break;
            }
        }


        return new PlToken( PlTokenType.ERR, "", EmptyFileInfo( this.filename ) );
    }
}

export default PlLexer;
