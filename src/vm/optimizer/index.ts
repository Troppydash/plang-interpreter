import {ASTFunction, ASTImpl, ASTProgram, ASTType} from "../../compiler/parsing/ast";

function hoisting(ast: ASTProgram) {
    let functions = [];
    let statements = [];

    for (const line of ast) {
        if (line instanceof ASTFunction || line instanceof ASTType || line instanceof ASTImpl) {
            functions.push(line);
        } else {
            statements.push(line);
        }
    }

    return [...functions, ...statements];
}

function collapseConstants(ast: ASTProgram): ASTProgram {
    return null;
}

const passes = [hoisting];

/**
 * Takes an ast tree and performance passes
 * @param ast The ast tree to performance passes on
 * @return The modified ast tree
 */
export function OptimizeProgram(ast: ASTProgram) {
    for (const pass of passes) {
        ast = pass(ast);
    }
    return ast;
}