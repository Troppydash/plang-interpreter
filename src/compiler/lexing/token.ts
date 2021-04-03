import { PlFile } from "../../inout/file";
import { PlFileInfo } from "./info";

export enum PlTokenType {
    // keywords
    FUNC,
    IMPL,
    IMPORT, AS, TAKE, ALL,
    EXPORT,
    RETURN, BREAK, CONTINUE,
    IF, ELIF, ELSE,
    EACH, IN,
    LOOP,
    WHILE,
    FOR,
    MATCH, CASE, DEFAULT,

    // operators words
    AND,
    OR,
    NOT,

    // operators symbols
    DOT,        // .
    ADD,        // +
    SUB,        // -
    MUL,        // *
    DIV,        // /
    INC,        // ++
    DEC,        // --
    GT,         // >
    LT,         // <
    GTE,        // >=
    LTE,        // <=
    EQ,         // ==
    NEQ,        // /=

    // symbols
    LBRACE,     // {
    RBRACE,     // }
    LPAREN,     // (
    RPAREN,     // )
    COMMA,      // ,
    FSLASH,     // /
    COLON,      // :
    SEMICOLON,  // ;

    // data types
    TYPE,
    NUMBER,
    BOOLEAN,
    VARIABLE,
    NULL,
    LIST,
    DICT,

    // others
    LF, EOF,
    ERR,
}

class PlToken {
    readonly type: PlTokenType;
    readonly content: string;
    readonly info: PlFileInfo;

    constructor( type: PlTokenType, content: string, info: PlFileInfo ) {
        this.type = type;
        this.content = content;
        this.info = info;
    }
}

export default PlToken;
