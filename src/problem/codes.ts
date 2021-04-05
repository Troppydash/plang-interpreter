export type PlProblemCode = keyof typeof templates;


const templates = {
    LE0001: "found an unknown character '%0'",
    LE0002: "reached EOF or LF with an unclosed double quote",
    LE0003: "unknown escape character '%0'"
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'this character does not belong here, maybe check your spelling?',
    LE0002: 'did you forget to close your strings?',
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash"
}

const problemFullName = {
    LE: "LexerError",
}

export function PCHint(pc: PlProblemCode): string {
    return hints[pc];
}
export function PCFullName(pc: PlProblemCode): string {
    return problemFullName[pc.substring(0, 2)];
}
export default templates;
