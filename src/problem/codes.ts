export type PlProblemCode = keyof typeof templates;


const templates = {
    LE0001: "found an unknown character '%0'"
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'maybe check your spelling?'
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
