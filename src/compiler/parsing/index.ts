import { PlProblem } from "../../problem/problem";
import { Lexer } from "../lexing";


interface Parser {
    readonly lexer: Lexer;
    parseOnce(): any;  // parse as little as possible to return
    parseAll(): any;  // parse as much as possible
}

// class PlParser implements Parser {}

// this parser is only an ast parser, the bytecode emitting parser will not make an ast tree
class PlAstParser implements Parser {

    readonly lexer: Lexer;

    private problems: PlProblem[];

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.problems = [];
    }


}
