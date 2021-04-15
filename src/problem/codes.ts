export type PlProblemCode = keyof typeof templates;

// TODO: Change Match Error
const templates = {
    // lexer errors
    LE0001: "found an unknown character '%0'",
    LE0002: "reached EOF or LF with an unclosed double quote",
    LE0003: "unknown escape character '%0'",

    // statement
    ET0001: "expected a newline at the end of a statement",

    // assign
    ET0002: "expected a variable or a dot chain on the left side of assignment",

    // dot
    ET0003: "expected a variable when accessing a field",

    // expression
    ET0004: "unexpected token '%0' found when parsing an expression",

    // postfix
    ET0005: "expected a variable when using the postfix operators",

    // list
    ET0006: "expected commas between list items",
    ET0007: "expected left parenthesis when creating a list",

    // call
    ET0008: "expected commas between function call arguments",

    // dictionary
    ET0009: "expected a variable or a number as the key of a dictionary",
    ET0010: "expected left parenthesis when creating a dictionary",
    ET0011: "expected colons between dictionary pairs",
    ET0012: "expected commas between dictionary pairs",

    // function
    ET0013: "expected variable name in a function definition",
    ET0014: "expected left parenthesis around the function parameters",
    ET0015: "expected function or impl parameter to be variables",
    ET0016: "expected commas between function or impl parameters",
    ET0017: "expected a left brace '{' after function parameters",

    // loop
    ET0018: "expected a left brace after loop keyword or amount",
    ET0019: "expected a left brace after while loop conditions",

    // export
    ET0020: "expected an expression after export",

    // if
    ET0021: "expected a left brace '{' after if conditions",
    ET0022: "expected a left brace '{' after elif conditions",
    ET0023: "expected a left brace '{' after else conditions",

    // each..in
    ET0024: "expected the value or key in an each statement to be a variable",
    ET0025: "expected the keyword in after the each value and keys",
    ET0026: "expected a left brace '{' after each..in statement",

    // impl
    ET0027: "expected a variable as the impl name",
    ET0028: "expected left parenthesis '(' around impl parameters",
    ET0029: "expected the keyword for after the impl parameters",
    ET0030: "expected a left brace '{' after impl definitions",

    // for loop
    ET0031: "expected semicolons between for loop pre-condition-post expressions",
    ET0032: "expected a left brace '{' after for loop expressions",

    // match
    ET0033: "expected a left brace '{' after match or match value",
    ET0034: "expected commas between case expressions in a match",
    ET0035: "expected a left brace '{' after a keyword default or a case expression",
    ET0042: "expected the keyword case or default in a match statement, got '%0'",

    // import
    ET0036: "expected a correct path in an import statement",
    ET0037: "expected the keyword select, as, or newline after an import path",
    ET0038: "expected a variable name for an import alias",
    ET0039: "expected commas between import select variables",
    ET0040: "expected variables for import select items",
    ET0041: "expected at least one select item in an import statement",


    CE0001: "reached EOF with an unclosed '}'",
    CE0002: "reached LF with an unclosed ')'",
    CE0003: "reached EOF with an unclosed ')'",
    CE0004: "reached EOF with an unclosed ')'",
    CE0005: "reached EOF with an unclosed ')'",
    CE0006: "reached EOF with an unclosed ')'",
    CE0007: "reached LF or EOF with an unclosed '}'",


    LP0001: "found two or more default options in a match statement",
    LP0002: "an impl statement must have at least one parameter",
    LP0003: "a case statement must have at least one expression",

    DE0001: "an exception occurred during compiling"
}

// because I am lazy
function simplyPutA(item: string = "left brace '{'", where: string = "'here' is pointing to"): string {
    return `simply put a ${item} after where ${where}`;
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'this character does not belong here, maybe check your spelling?',
    LE0002: 'did you forget to close your strings?',
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash",

    ET0001: "statements have to be on different lines, simply press 'enter' after where 'here' is pointing to.\nthis often occurs when there is an syntax error",
    ET0002: "you cannot assign to an rvalue, maybe check your spelling?",
    ET0003: "you cannot access a key that is a non variable, try using the .get() method",
    ET0004: "the syntax here is wrong, this is likely to occur if you forgot to complete a statement",
    ET0005: "you cannot increase/decrease a rvalue, maybe check your spelling?",
    ET0006: "simply put a comma ',' after where 'here' is pointing to",
    ET0007: "simply put a parenthesis '(' after where 'here' is pointing to",
    ET0008: "simply put a comma ',' after where 'here' is pointing to",
    ET0009: "remove the quotes around the key if you've added them,\nor if you wanted to use a variable as a key, try the .set() method",
    ET0010: "simply put a parenthesis '(' after where 'here' is pointing to",
    ET0011: "simply put a colon ':' after where 'here' is pointing to",
    ET0012: "simply put a comma ',' after where 'here' is pointing to",
    ET0013: "you cannot have a function name that is not text",
    ET0014: "simply put a parenthesis '(' after 'here',\nif the function doesn't take any parameters, put an empty set of '()' after the function name",
    ET0015: "a variable can only began with an underscore '_' or a character",
    ET0016: simplyPutA("comma ','"),
    ET0017: simplyPutA(),
    ET0018: simplyPutA(),
    ET0019: simplyPutA(),
    ET0020: "you cannot export nothing. To export every thing, remove this statement",
    ET0021: simplyPutA(),
    ET0022: simplyPutA(),
    ET0023: simplyPutA(),
    ET0024: "a variable begins with a letter or an underscore",
    ET0025: "maybe check the syntax for an each..in statement: each value, key in array {}",
    ET0026: simplyPutA(),
    ET0027: "a variable begins with a letter or an underscore",
    ET0028: simplyPutA("a parenthesis '('"),
    ET0029: simplyPutA("keyword for"),
    ET0030: simplyPutA(),
    ET0031: "the conditions of a for loop needs to be separated by semicolons ';', simply put one after 'here'",
    ET0032: simplyPutA(),
    ET0033: simplyPutA(),
    ET0034: "case expressions must be separated by commas ','",
    ET0035: simplyPutA(),
    ET0036: "a correct path is made of variables or . or .. separated by a slash '/'",
    ET0037: "maybe check your import syntax",
    ET0038: "an alias must be a valid variable that begins with an underscore '_' or a character",
    ET0039: "import select variables must have a comma ',' between them",
    ET0040: "import select variables must be valid variables",
    ET0041: "you cannot select no variables, if importing all variables are needed, try the 'select *' syntax",
    ET0042: "check your match statement syntax, there is likely an unexpected token where the keywords are",

    CE0001: "did you forget to close a block?",
    CE0002: "did you forget to close a group?",
    CE0003: "did you forget to close a dict?",
    CE0004: "did you forget to close a list?",
    CE0005: "did you forget to close an argument list?",
    CE0006: "did you forget to close an parameter list",
    CE0007: "did you forget to close your match statement?",


    LP0001: "there can be only one default block in a match statement, try removing all other default blocks in the match",
    LP0002: "the first parameter in an impl statement is by convention 'self'",
    LP0003: "a case statement with no expressions will match nothing, if matching nothing is intended, try the 'default {}' syntax",

    DE0001: "the developer made a mistake, either tell him or find a workaround"

}

const problemFullName = {
    LE: "LexerError",
    ET: "UnexpectedToken",
    CE: "ClosingError",
    LP: "LogicalProblem",
    DE: "DeveloperError"
}

export function PCHint(pc: PlProblemCode): string {
    const hint = hints[pc];
    if (hint.length == 0) {
        return "there are no hints";
    }
    return hint;
}

export function PCFullName(pc: PlProblemCode): string {
    return problemFullName[pc.substring(0, 2)];
}

export default templates;
