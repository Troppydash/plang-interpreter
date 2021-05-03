export type PlProblemCode = keyof typeof templates;

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

    // each..of
    ET0024: "expected the value or key in an each statement to be a variable",
    ET0025: "expected the keyword 'of' after the each value and keys",
    ET0026: "expected a left brace '{' after each..of statement",

    // impl
    ET0027: "expected a variable as the impl name",
    ET0028: "expected left parenthesis '(' around impl parameters",
    ET0029: "expected the keyword for after the impl parameters",
    ET0030: "expected a left brace '{' after impl definitions",
    ET0043: "expected a type in an impl definition",

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
    CE0008: "reached EOF with an unclosed '\"\"\"'",


    LP0001: "found two or more default options in a match statement",
    LP0002: "an impl statement must have at least one parameter",
    LP0003: "a case statement must have at least one expression",

    DE0001: "an exception occurred during compiling\n%0",
    DE0002: "an exception occurred during interpreting\n%0",

    RE0001: "found an unknown bytecode with type '%0'",
    RE0002: "no debug information found for problem on bytecode line '%0'",
    RE0003: "cannot find the variable named '%0'",
    RE0004: "there exists no operator '%0' on type '%1'",
    RE0005: "expect a number to negate with, got type '%0'",
    RE0006: "incorrect arity for a function call, needed %0 but got %1",
    RE0007: "panic '%0'",
    RE0008: "attempted to call an uncallable value of type '%0'",
    RE0009: "cannot use 'continue' or 'break' outside a loop",
    RE0010: "saw a jump instruction but the value is not a boolean, got type '%0'",
    RE0011: "cannot decrease or increase a non variable of type '%0'",
    RE0012: "cannot find value with key '%0' on the target of type '%1'",
    RE0013: "cannot assign to a non dictionary target, got type '%0'",

    RE0014: "expected a boolean value here, got type '%0'",
    RE0015: "expected a number value here, got type '%0'",
    RE0016: "expected the '.%0' type function on the value of type '%1'",

    RE0017: "not can only take a boolean value, got type '%0'",
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
    ET0025: "maybe check the syntax for an each..of statement: each value, key in array {}",
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
    ET0043: "an imply statement targets a type only, check the expression after the 'for' keyword here",

    CE0001: "did you forget to close a block?",
    CE0002: "did you forget to close a group?",
    CE0003: "did you forget to close a dict?",
    CE0004: "did you forget to close a list?",
    CE0005: "did you forget to close an argument list?",
    CE0006: "did you forget to close an parameter list",
    CE0007: "did you forget to close your match statement?",
    CE0008: "did you forget to close a multiline string?",


    LP0001: "there can be only one default block in a match statement, try removing all other default blocks in the match",
    LP0002: "the first parameter in an impl statement is by convention 'self'",
    LP0003: "a case statement with no expressions will match nothing, if matching nothing is intended, try the 'default {}' syntax",

    DE0001: "the developer made a mistake, either tell him or find a workaround",
    DE0002: "the developer made a mistake, either tell him or find a workaround",

    RE0001: "unknown bytecode is produced from the emitter, a developer problem at the core",
    RE0002: "you are on your own here",
    RE0003: "is the variable defined?",
    RE0004: "the operator is not a valid operation on this type",
    RE0005: "only numbers can be negated",
    RE0006: "check the number of arguments for the function call, there might be a few missing or a few extras",
    RE0007: "a function panicked, try reading the message below",
    RE0008: "you can only call a function, check the value that is stored in the variable?",
    RE0009: "is this statement surrounded by a loop?",
    RE0010: "the machine had expected a boolean type, check if the type of the value is as expected",

    RE0011: "the ++ and -- operators can only be applied onto a variable",
    RE0012: "the key does not exist on the value here, maybe check the spelling?",
    RE0013: "the left side of the dot in an assignment have to be a dictionary type, if modifying type functions, use a 'impl' statement instead",

    RE0014: "a boolean is expected here, check if the expression returns a true or a false",
    RE0015: "a number is expected here, check if the expression returns a number",
    RE0016: "only a value that contain the '.iter' type function can be used in a each..of loop, is the value a list or a dictionary?",
    RE0017: "maybe check if the expression returns a boolean value?"
}

const problemFullName = {
    LE: "LexerError",
    ET: "UnexpectedToken",
    CE: "ClosingError",
    LP: "LogicalProblem",
    DE: "DeveloperError",
    RE: "RuntimeError",
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
