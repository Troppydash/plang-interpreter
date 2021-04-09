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
    ET0007: "expected parenthesis when creating a list",
    ET0008: "expected commas between function call arguments",
    ET0009: "expected a variable or a number as the key of a dictionary",
    ET0010: "expected parenthesis when creating a dictionary",
    ET0011: "expected colons between dictionary pairs",
    ET0012: "expected commas between dictionary pairs",
    ET0013: "expected variable name in a function definition",
    ET0014: "expected parenthesis around the function parameters",
    ET0015: "expected function parameter to be variables",
    ET0016: "expected commas between function parameters",
    ET0017: "expected a left brace '{' after function parameters",
    ET0018: "expected a left brace after loop keyword or amount",
    ET0019: "expected a left brace after while loop conditions",
    ET0020: "expected an expression after export",
    ET0021: "expected a left brace '{' after if conditions",
    ET0022: "expected a left brace '{' after elif conditions",
    ET0023: "expected a left brace '{' after else conditions",

    CE0001: "reached EOF with an unclosed '}'",
    CE0002: "reached LF with an unclosed ')'",

    DE0001: "an exception occurred during compiling"
}

// because I am lazy
function simplyPutA(item: string = "comma ','", where: string = "'here' is pointing to"): string {
    return `simply put a ${item} after where ${where}`;
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'this character does not belong here, maybe check your spelling?',
    LE0002: 'did you forget to close your strings?',
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash",

    ET0001: "statements have to be on different lines, simply press 'enter' after where 'here' is pointing to",
    ET0002: "you cannot assign to an rvalue, maybe check your spelling?",
    ET0003: "you cannot access a key that is a non variable, try using 3the .get() method",
    ET0004: "the syntax here is wrong, this is likely to occur if you forgot to complete a statement",
    ET0005: "you cannot increase/decrease a rvalue, maybe check your spelling?",
    ET0006: "simply put a comma ',' after where 'here' is pointing to",
    ET0007: "simply put a parenthesis '(' or ')' after where 'here' is pointing to",
    ET0008: "simply put a comma ',' after where 'here' is pointing to",
    ET0009: "remove the quotes around the key if you've added them,\nor if you wanted to use a variable as a key, try the .set() method",
    ET0010: "simply put a parenthesis '(' or ')' after where 'here' is pointing to",
    ET0011: "simply put a colon ':' after where 'here' is pointing to",
    ET0012: "simply put a comma ',' after where 'here' is pointing to",
    ET0013: "you cannot have a function name that is not text",
    ET0014: "simply put a parenthesis '(' or ')' after 'here',\nif the function doesn't take any parameters, put an empty set of '()' after the function name",
    ET0015: "a variable can only began with an underscore '_' or a character",
    ET0016: simplyPutA(),
    ET0017: simplyPutA("left brace '{'"),
    ET0018: simplyPutA("left brace '{'"),
    ET0019: simplyPutA("left brace '{'"),
    ET0020: "you cannot export nothing. To export every thing, remove this statement",
    ET0021: "",
    ET0022: "",
    ET0023: "",

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
