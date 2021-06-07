export type PlProblemCode = keyof typeof templates;

const templates = {
    // lexer errors
    LE0001: "found an unrecognized character '%0'",
    LE0002: "reached newline with an unclosed double quote",
    LE0003: "found an unrecognized escape sequence '%0'",
    LE0004: "reached newline with an unclosed left parenthesis during string replacement",

    // statement
    ET0001: "expected a newline after a statement",

    // assign
    ET0002: "expected a variable or a dot expression on the left side of assignment",

    // dot
    ET0003: "expected a variable after the dot",

    // expression
    ET0004: "found an unexpected character '%0' when parsing expression",

    // postfix
    ET0005: "expected a variable when using the postfix operators",

    // list
    ET0006: "expected commas ',' between list items",
    ET0007: "expected left parenthesis '(' when creating a list",

    // call
    ET0008: "expected commas ',' between function call arguments",

    // dictionary
    ET0009: "expected a valid variable as the key in a dictionary",
    ET0010: "expected left parenthesis '(' when creating a dictionary",
    ET0011: "expected colons ':' between dictionary pairs",
    ET0012: "expected commas ','  between dictionary pairs",

    // function
    ET0013: "expected variable name in a function definition",
    ET0014: "expected left parenthesis '(' around the function parameters",
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
    ET0023: "expected a left brace '{' after else",

    // each..of
    ET0024: "expected the value or key in an each statement to be a variable",
    ET0025: "expected the keyword 'of' after the each value and keys",
    ET0026: "expected a left brace '{' after each..of statement",

    // impl
    ET0027: "expected a variable as the impl name",
    ET0028: "expected left parenthesis '(' around impl parameters",
    ET0029: "expected the keyword 'for' after the impl parameters",
    ET0030: "expected a left brace '{' after impl definitions",
    ET0043: "expected a type in an impl definition",

    // for loop
    ET0031: "expected semicolons between for loop pre-condition-post expressions",
    ET0032: "expected a left brace '{' after for loop expressions",

    // match
    ET0033: "expected a left brace '{' after match or match value",
    ET0034: "expected commas between case expressions in a match",
    ET0035: "expected a left brace '{' after a keyword default or a case expression",
    ET0042: "expected the keyword case or default in a match statement",

    // import
    ET0036: "expected a correct path in an import statement",
    ET0037: "expected the keyword select, as, or newline after an import path",
    ET0038: "expected a variable name for an import alias",
    ET0039: "expected commas between import select variables",
    ET0040: "expected variables for import select items",
    ET0041: "expected at least one select item in an import statement",

    // type
    ET0044: "expected a variable as the type name",
    ET0045: "expected a left parenthesis '(' after the keyword 'type'",
    ET0046: "expected commas between type members",
    ET0047: "expected type members to be variables",


    CE0001: "reached newline with an unclosed '}'",
    CE0002: "reached newline with an unclosed ')'",
    CE0003: "reached newline with an unclosed ')'",
    CE0004: "reached newline with an unclosed ')'",
    CE0005: "reached newline with an unclosed ')'",
    CE0006: "reached newline with an unclosed ')'",
    CE0007: "reached newline with an unclosed '}'",
    CE0008: "reached newline with an unclosed '\"\"\"'",
    CE0009: "reached newline with an unclosed ')'",


    LP0001: "found two or more default cases in a match statement",
    LP0002: "an impl type function must have at least one parameter",
    LP0003: "a case statement must have at least one expression",

    DE0001: "an exception occurred during compiling\n%0",
    DE0002: "an exception occurred during interpreting\n%0",

    RE0001: "found an unknown bytecode of type '%0'",
    RE0002: "no debug information found for problem on line '%0'",
    RE0003: "cannot find the variable named '%0' in the surrounding frame",
    RE0004: "there exists no function '%0' on type '%1'",
    RE0005: "expected a number to negate with, got type '%0'",
    RE0006: "incorrect arity for a function call, needed %0 but got %1",
    RE0007: "%0",
    RE0008: "attempted to call an uncallable value of type '%0'",
    RE0009: "cannot use 'continue' or 'break' outside a loop",
    RE0010: "top of the stack is not a boolean for a conditional jump, got type '%0'",
    RE0011: "loop statements can only take numeral arguments, got type '%0'",
    RE0012: "cannot find the key '%0' on the target of type '%1'",
    RE0013: "cannot assign to a non dictionary target, got type '%0'",

    RE0014: "expected a boolean value here, got type '%0'",
    RE0015: "expected a numeral value here, got type '%0'",
    RE0016: "expected the '.%0' type function on the value of type '%1'",

    RE0017: "cannot use 'not' on a non-boolean value, got type '%0'",

    RE0018: "function expected a type of '%0' for the '%1'th argument, got '%2'"
}

// because I am lazy
function simplyPutA( item: string = "left brace '{'", where: string = "'here' is pointing to" ): string {
    return `simply put a ${item} after where ${where}`;
}

function INeedA(what: string) {
    return `I need a ${what}, sticking to the english alphabet is the best bet here`
}

function tryPutting(prefix: string) {
    return `${prefix}, try putting one after 'here'`;
}

function followingSyntax(statement: string, syntax: string, need: string) {
    return `${statement} have the following syntax:\n${syntax}\nI found that you are missing ${need}`;
}

function haveYouClosed(type: string, w: string) {
    return `${type}(s) need to be closed with ${w}, have you closed this ${type}?`;
}

const hints: Record<PlProblemCode, string> = {
    LE0001: 'I do not understand this character, are you sure that it belongs here?',
    LE0002: haveYouClosed("strings", "a closing '\"'"),
    LE0003: "if you intended to type '\\', write two forward-slashes '\\\\' to escape the first slash",
    LE0004: "a string replacement looks like this: \"Hello \\(name)\", have you added a ')' to close this replacement?",

    ET0001: "this often occurs when there is a syntax problem, but if you intend to write multiple statements on one line, well, you can't",

    ET0002: "I cannot assign to this value, the left side of the assigment must not be an expression",

    ET0003: "you cannot access a field that contains symbols using the dot syntax, if you wish so, try using the '.get(key)' type function",

    ET0004: "this expression have the wrong syntax, take a look at the documentation to see what is the valid syntax for Deviation",

    ET0005: "'++' and '--' cannot be used on expressions, I can only increase or decrease variables",

    ET0006: "list items are separated by ',', try putting one after 'here'",
    ET0007: simplyPutA("left paren '('"),

    ET0008: "evoking arguments are separated by ',', try putting one after 'here'",

    ET0009: "a dictionary needs keys that are valid variables, I cannot set operators or symbols as keys of the dictionary",
    ET0010: simplyPutA("left paren '('"),
    ET0011: tryPutting("a dictionary key,value pair is separated with ':'"),
    ET0012: tryPutting("dictionary key,value pairs are separated by ','"),

    ET0013: INeedA("valid variable name to name the function"),
    ET0014: "function parameters are separated by ',', try putting one after 'here'. And if the function doesn't take any parameters, place an empty set of '()' after the function name",
    ET0015: INeedA("valid name for the parameters of a (type) function"),
    ET0016: tryPutting("(type) function parameters are separated by ','"),
    ET0017: simplyPutA(),

    ET0018: simplyPutA(),
    ET0019: simplyPutA(),

    ET0020: "you cannot export nothing. To export every thing, remove this statement",

    ET0021: simplyPutA(),
    ET0022: simplyPutA(),
    ET0023: simplyPutA(),

    ET0024: INeedA("valid name for the value and key in a each..of statement"),
    ET0025: followingSyntax("an each..of statement", "each value, key of target {}", "the 'of' keyword"),
    ET0026: simplyPutA(),

    ET0027: INeedA("valid variable name to name the type function"),
    ET0028: simplyPutA( "a parenthesis '('" ),
    ET0029: followingSyntax("an impl statement", "impl hello(self) for Num {}", "the 'for' keyword"),
    ET0030: simplyPutA(),
    ET0043: followingSyntax("an impl statement", "impl hello(self) for Num {}", "a type after the 'for' keyword"),

    ET0031: "the conditions of a for loop needs to be separated by semicolons ';', simply put one after 'here'",
    ET0032: simplyPutA(),

    ET0033: simplyPutA(),
    ET0034: tryPutting("match case options must be separated by ','"),
    ET0035: simplyPutA(),
    ET0042: followingSyntax("a match statement", `match item {
    case 1, 2 {}
}`, "the keyword 'case' or 'default' here"),

    ET0036: "a correct path is made of variables or . or .. separated by a slash '/'",
    ET0037: "maybe check your import syntax",
    ET0038: "an alias must be a valid variable that begins with an underscore '_' or a character",
    ET0039: "import select variables must have a comma ',' between them",
    ET0040: "import select variables must be valid variables",
    ET0041: "you cannot select no variables, if importing all variables are needed, try the 'select *' syntax",

    ET0044: INeedA("valid variable name to name the type"),
    ET0045: simplyPutA("left parenthesis '('"),
    ET0046: tryPutting("type members are separated with ','"),
    ET0047: INeedA("valid variable name for the type members"),


    CE0001: haveYouClosed("blocks", "a closing '}'"),
    CE0002: haveYouClosed("groups", "a closing ')'"),
    CE0003: haveYouClosed("dictionary", "a closing ')'"),
    CE0004: haveYouClosed("list", "a closing ')'"),
    CE0005: haveYouClosed("argument list", "a closing ')'"),
    CE0006: haveYouClosed("parameter list", "a closing ')'"),
    CE0007: haveYouClosed("match statement", "a closing '}'"),
    CE0008: haveYouClosed("multiline string", "a closing '\"\"\"'"),
    CE0009: haveYouClosed("type member", "a closing ')'"),

    LP0001: "there can be only one default block in a match statement, try removing all other default cases",
    LP0002: "the first parameter in an impl statement is by convention 'self'",
    LP0003: "a case statement with no expressions will match nothing, if matching nothing is intended, try the 'default {}' syntax",

    DE0001: "the developer made a mistake, please show him how to reproduce this",
    DE0002: "the developer made a mistake, please show him how to reproduce this",

    RE0001: "there is an unknown bytecode in the program, it might be a developer mistake",
    RE0002: "try running the interpreter with debug on, it also might be a developer mistake",
    RE0003: "this variable is not defined anywhere that I've looked",
    RE0004: "I cannot do this operation with these types",
    RE0005: "I can only negate numbers",
    RE0006: "check the number of arguments for the function call, there might be a few missing or a few extras",
    RE0007: "a function panicked, try reading the message below",
    RE0008: "I can only call a function, what the value that is stored in this variable?",
    RE0009: "the keywords 'continue' and 'break' needs to be used inside a loop",
    RE0010: "I saw a jump instruction but the value is not a boolean",

    RE0011: "I need a number as the amount of times to run this loop statement",
    RE0012: "I cannot find this key in the value, maybe check your spelling?",
    RE0013: "I cannot assign to a non dictionary or type target, if you are trying to make a new type function, try the 'impl' statement",

    RE0014: "I want a boolean here, this language does not like implicit truthy conditions",
    RE0015: "I can only increment or decrement numbers, nothing else",
    RE0016: "only a value that contain the '.iter' type function can be used in a each..of loop",
    RE0017: "I can only 'not' booleans, this language does not like implicit truthy conditions",
    RE0018: "",
}

const problemFullName = {
    LE: "LexerError",
    ET: "BadToken",
    CE: "ClosingError",
    LP: "LogicalProblem",
    DE: "DevError",
    RE: "ExeProblem",
}

export function PCHint( pc: PlProblemCode ): string {
    const hint = hints[pc];
    if ( hint.length == 0 ) {
        return "there are no hints";
    }
    return hint;
}

export function PCFullName( pc: PlProblemCode ): string {
    return problemFullName[pc.substring( 0, 2 )];
}

export default templates;
