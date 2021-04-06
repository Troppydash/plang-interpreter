import { PlFileInfo } from "./info";
import { escapeString } from "../../extension";

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
    ASGN,       // =
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
    // FSLASH,     // /
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
    STR,

    // others
    LF, EOF,
    SPAN,
    ERR,
}

interface PlToken {
    type: PlTokenType;
    content: string;
    info: PlFileInfo;
}

export function NewPlToken(type: PlTokenType, content: string, info: PlFileInfo) {
    return {
        type,
        content,
        info
    }
}

export function PlTokenToString(token: PlToken) {
    return `[${token.type}|'${escapeString(token.content)}'|${token.info.row}:${token.info.col-token.info.length}-${token.info.col},<${token.info.filename}>]`;
}

export default PlToken;
