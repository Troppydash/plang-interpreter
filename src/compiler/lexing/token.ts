import { NewEmptyFileInfo, NewFileInfo, PlFileInfo } from "./info";
import {escapeString} from "../../extension/text";

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

    OUTER, INNER, LOCAL,

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
    MOD,        // %
    EXP,        // ^,
    SELF,       // &


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
    LBRACK,     // [
    RBRACK,     // ]

    // data types
    TYPE,
    NUMBER,
    BOOLEAN,
    VARIABLE,
    NULL,
    STR,

    // others
    LF, EOF,
    SPAN,
    ERR,
}

// tokens that cannot be used as dict names
export const NAME_BLACKLIST: PlTokenType[] = [
    PlTokenType.LPAREN,
    PlTokenType.RPAREN,
    PlTokenType.LBRACE,
    PlTokenType.RBRACE,
    PlTokenType.COMMA,
    PlTokenType.COLON,
    PlTokenType.SEMICOLON,

    PlTokenType.DOT,
    PlTokenType.ADD,
    PlTokenType.SUB,
    PlTokenType.MUL,
    PlTokenType.DIV,
    PlTokenType.ASGN,
    PlTokenType.INC,
    PlTokenType.DEC,
    PlTokenType.GT,
    PlTokenType.LT,
    PlTokenType.GTE,
    PlTokenType.LTE,
    PlTokenType.EQ,
    PlTokenType.NEQ,

    PlTokenType.LF, PlTokenType.EOF
];

export const TOKEN_OPERATORS = [
    PlTokenType.ADD,
    PlTokenType.SUB,
    PlTokenType.MUL,
    PlTokenType.DIV,
    PlTokenType.MOD,
    PlTokenType.EXP,
    PlTokenType.GT,
    PlTokenType.GTE,
    PlTokenType.LT,
    PlTokenType.LTE,
    PlTokenType.EQ,
    PlTokenType.NEQ,
];

export const TOKEN_VAR_BLACKLIST = [
    PlTokenType.COLON,
    PlTokenType.LBRACE,
    PlTokenType.RBRACE,
    PlTokenType.LPAREN,
    PlTokenType.RPAREN,
    PlTokenType.COMMA,
    PlTokenType.DOT,
    PlTokenType.LF,
    PlTokenType.EOF,
    PlTokenType.SEMICOLON,
]

interface PlToken {
    type: PlTokenType;
    content: string;
    info: PlFileInfo;
}



export function PlTokenToPlVariable(token: PlToken): PlToken | null {
    if (token.type == PlTokenType.VARIABLE) {
        return token;
    }
    if (TOKEN_VAR_BLACKLIST.includes(token.type)) {
        return null;
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
