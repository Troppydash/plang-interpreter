export type PlProblemCode = keyof typeof templates;

const templates = {
    // lexer errors
    LE0001: "unrecognized character '%0'",
    LE0002: "reached newline with unclosed double quote",
    LE0003: "unrecognized escape sequence '%0'",
    LE0004: "reached newline with unclosed left parenthesis",

    // statement
    ET0001: "expected a newline after a statement",

    // assign
    ET0002: "expected a variable on the left side of assignment",

    // dot
    ET0003: "expected a variable after the dot",

    // expression
    ET0004: "unexpected character '%0' during expression",

    // postfix
    ET0005: "expected a variable before postfix operators",

    // list
    ET0006: "expected ',' between list items",
    ET0007: "expected '(' when creating a list",

    // call
    ET0008: "expected ',' between function arguments",

    // dictionary
    ET0009: "expected a variable as the key in a dictionary",
    ET0010: "expected  '(' when creating a dictionary",
    ET0011: "expected ':' between dictionary pairs",
    ET0012: "expected ',' between dictionary pairs",

    // function
    ET0013: "expected a name in a function definition",
    ET0014: "expected '(' around the function parameters",
    ET0015: "expected variables for function or impl parameters",
    ET0016: "expected ',' between function or impl parameters",
    ET0017: "expected '{' after function or impl parameters",

    // loop
    ET0018: "expected '{' after loop keyword or amount",
    ET0019: "expected '{' after while loop conditions",

    // export
    ET0020: "expected an expression after export",

    // if
    ET0021: "expected '{' after if conditions",
    ET0022: "expected '{' after elif conditions",
    ET0023: "expected '{' after else",

    // each..of
    ET0024: "expected variables for the value or key in each..of statement",
    ET0025: "expected keyword 'of' in each..of statement",
    ET0026: "expected '{' after each..of statement",

    // impl
    ET0027: "expected a variable as the imply name",
    ET0028: "expected '(' around impl parameters",
    ET0029: "expected keyword 'for' after impl parameters",
    ET0030: "expected '{' after impl definitions",
    ET0043: "expected a target type in an impl definition",

    // for loop
    ET0031: "expected ';' between pre-condition-post expressions",
    ET0032: "expected '{' after for-loop expressions",

    // match
    ET0033: "expected '{' after match or match value",
    ET0034: "expected ':' between case expressions in a match",
    ET0035: "expected '{' after a keyword default or a case expression",
    ET0042: "expected keyword 'case' or 'default' in a match statement",

    // import
    ET0036: "expected a correct path in an import statement",
    ET0037: "expected the keyword select, as, or newline after an import path",
    ET0038: "expected variable name for an import alias",
    ET0039: "expected commas between import select variables",
    ET0040: "expected variables for import select items",
    ET0041: "expected at least one select item in an import statement",

    // type
    ET0044: "expected a variable as the type name",
    ET0045: "expected '(' after the keyword 'type'",
    ET0046: "expected ',' between type members",
    ET0047: "expected variables for type members",

    ET0048: "expected a variable",



    CE0001: "reached newline with unclosed '}'",
    CE0002: "reached newline with unclosed ')'",
    CE0003: "reached newline with unclosed ')'",
    CE0004: "reached newline with unclosed ')'",
    CE0005: "reached newline with unclosed ')'",
    CE0006: "reached newline with unclosed ')'",
    CE0007: "reached newline with unclosed '}'",
    CE0008: "reached newline with unclosed '\"\"\"'",
    CE0009: "reached newline with unclosed ')'",


    LP0001: "more than one default cases in a match statement",
    LP0002: "zero parameters for an impl definition",
    LP0003: "no conditions for a case statement",

    DE0001: "problem during compiling\n%0",
    DE0002: "problem during interpreting\n%0",

    RE0001: "encountered unknown bytecode: '%0'",
    RE0002: "problem on line '%0'",
    RE0003: "no variable named '%0' found",
    RE0004: "no function '%0' on type '%1'",
    RE0005: "cannot negate '%0'",
    RE0006: "incorrect arity for a function call, needs %0 but got %1",
    RE0007: "%0",
    RE0008: "calling an uncallable value of type '%0'",
    RE0009: "'continue' or 'break' used outside a loop",
    RE0010: "not a boolean needed for jump, got type '%0'",
    RE0011: "non numeral loop iterations of type '%0'",
    RE0012: "no key '%0' on target of type '%1'",
    RE0013: "cannot assign to target of type '%0'",

    RE0014: "not a boolean, got type '%0'",
    RE0015: "not a number, got type '%0'",
    RE0016: "need '.%0' type function on value of type '%1'",

    RE0017: "use of 'not' on a non-boolean value of type '%0'",

    RE0018: "'%1' argument failed to satisfy '%0', got '%2' instead",
    RE0019: "no parameter guard named '%0' found",
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
    ET0048: "",

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
    RE0019: "",

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
