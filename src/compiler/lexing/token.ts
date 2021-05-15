import { NewEmptyFileInfo, NewFileInfo, PlFileInfo } from "./info";
import { escapeString } from "../../extension";

export enum PlTokenType {
    // keywords
    FUNC,
    IMPL,
    IMPORT, AS, SELECT,
    EXPORT,
    RETURN, BREAK, CONTINUE,
    IF, ELIF, ELSE,
    EACH, OF,
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
    COLON,      // :
    SEMICOLON,  // ;

    // data types
    TYPE,
    NUMBER,
    BOOLEAN,
    VARIABLE,
    NULL,
    // LIST,
    // DICT,
    STR,

    // others
    LF, EOF,
    SPAN,
    ERR,
}

export const TOKEN_OPERATORS = [
    PlTokenType.ADD,
    PlTokenType.SUB,
    PlTokenType.MUL,
    PlTokenType.DIV,
    PlTokenType.GT,
    PlTokenType.GTE,
    PlTokenType.LT,
    PlTokenType.LTE,
    PlTokenType.EQ,
    PlTokenType.NEQ,
];

interface PlToken {
    type: PlTokenType;
    content: string;
    info: PlFileInfo;
}

export function PlTokenToPlVariable(token: PlToken) {
    if (token.type == PlTokenType.VARIABLE) {
        return token;
    }
    return NewPlToken(PlTokenType.VARIABLE, token.content, token.info);
}

export function NewPlToken(type: PlTokenType, content: string, info: PlFileInfo) {
    return {
        type,
        content,
        info
    }
}

export function NewFakePlToken(type: PlTokenType, content: string) {
    return {
        type,
        content,
        info: NewEmptyFileInfo('')
    };
}

export function PlTokenToString(token: PlToken) {
    return `[${token.type}|'${escapeString(token.content)}'|${token.info.row}:${token.info.col-token.info.length}-${token.info.col},<${token.info.filename}>]`;
}

export default PlToken;
