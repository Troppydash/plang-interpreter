export type PlProblemCode = keyof typeof templates;


const templates = {
    LE0001: "found an unknown character '%0'",
    LE0002: "reached EOF or LF with an unclosed double quote",
    LE0003: "unknown escape character '%0'",

    ET0001: "expected a newline at the end of a statement",
    ET0002: "expected a variable or dot chains here",

    CE0001: "reached EOF with an unclosed '}'"
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'this character does not belong here, maybe check your spelling?',
    LE0002: 'did you forget to close your strings?',
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash",

    ET0001: "statements have to be on different lines, simply press enter where 'here' is pointing to",
    ET0002: "you cannot assign to an rvalue, maybe check your spelling?",

    CE0001: "did you forget to close a block?",

}

const problemFullName = {
    LE: "LexerError",
    ET: "ExpectedToken",
    CE: "ClosingError"
}

export function PCHint(pc: PlProblemCode): string {
    return hints[pc];
}
export function PCFullName(pc: PlProblemCode): string {
    return problemFullName[pc.substring(0, 2)];
}
export default templates;
