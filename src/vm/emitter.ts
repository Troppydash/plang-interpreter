import { NewBytecode, PlBytecode, PlBytecodeType } from "./bytecode";
import { ASTBinary, ASTNode, ASTNumber, ASTProgram, ASTStatement, ASTVariable } from "../compiler/parsing/ast";
import { PlTokenType } from "../compiler/lexing/token";

// TODO: Add Emitter Error

export function EmitProgram(ast: ASTProgram): PlBytecode[] {
    let program = [];
    for (const statement of ast) {
        program.push(...EmitStatement(statement));
    }
    return program;
}

export function EmitStatement(statement: ASTStatement): PlBytecode[] {
    return traverseAST(statement);
}

function traverseAST(node: ASTNode): PlBytecode[] {
    if (node instanceof ASTNumber) {
        return [NewBytecode(PlBytecodeType.DEFNUM,  ''+node.value, node.tokens[0])];
    } else if (node instanceof ASTVariable) {
        return [NewBytecode(PlBytecodeType.DEFVAR, node.content, node.tokens[0])];
    } else if (node instanceof ASTBinary) {
        const args = [
            ...traverseAST(node.right),
            ...traverseAST(node.left)
        ]
        const operator = node.operator;
        let bct;
        switch (operator.type) {
            case PlTokenType.ADD:
                bct = PlBytecodeType.DOADD;
                break;
            case PlTokenType.SUB:
                bct = PlBytecodeType.DOSUB;
                break;
            case PlTokenType.MUL:
                bct = PlBytecodeType.DOMUL;
                break;
            case PlTokenType.DIV:
                bct = PlBytecodeType.DODIV;
                break;
            default: {
                bct = PlBytecodeType.DOADD;
            }
        }
        args.push(NewBytecode(bct, "", operator));
        return args;
    }
    else {
        // error
        console.log("DEBUG WARNING!");
        return [NewBytecode(PlBytecodeType.RETURN, '', node.firstToken())];
    }
}

