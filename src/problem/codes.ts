export type PlProblemCode = keyof typeof templates;


const templates = {
    LE0001: "found an unknown character '%0'",
    LE0002: "reached EOF or LF with an unclosed double quote",
    LE0003: "unknown escape character '%0'",

    ET0001: "expected a newline at the end of a statement",
    ET0002: "expected a variable or a dot chain on the left side of assignment",
    ET0003: "expected a variable when accessing a field",
    ET0004: "unexpected token '%0' found when parsing an expression",
    ET0005: "expected a variable when using the postfix operators",
    ET0006: "expected commas between list items",
    ET0007: "expected left parenthesis when creating a list",
    ET0008: "expected commas between function call arguments",

    CE0001: "reached EOF with an unclosed '}'",
    CE0002: "reached LF with an unclosed ')'",

    DE0001: "an exception occurred during compiling"
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'this character does not belong here, maybe check your spelling?',
    LE0002: 'did you forget to close your strings?',
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash",

    ET0001: "statements have to be on different lines, simply press 'enter' after where 'here' is pointing to",
    ET0002: "you cannot assign to an rvalue, maybe check your spelling?",
    ET0003: "you cannot access a key that is a non variable, try using 3the .get() method",
    ET0004: "the syntax here is wrong",
    ET0005: "you cannot increase/decrease a rvalue, maybe check your spelling?",
    ET0006: "simply enter a comma ',' after where 'here' is pointing to",
    ET0007: "simply enter a parenthesis '(' or ')' after where 'here' is pointing to",
    ET0008: "simply enter a comma ',' after where 'here' is pointing to",

    CE0001: "did you forget to close a block?",
    CE0002: "did you forget to close a group?",

    DE0001: "the developer made a mistake, either tell him or find a workaround"

}

const problemFullName = {
    LE: "LexerError",
    ET: "UnexpectedToken",
    CE: "ClosingError",
    DE: "DeveloperError"
}

export function PCHint(pc: PlProblemCode): string {
    return hints[pc];
}

export function PCFullName(pc: PlProblemCode): string {
    return problemFullName[pc.substring(0, 2)];
}

export default templates;
