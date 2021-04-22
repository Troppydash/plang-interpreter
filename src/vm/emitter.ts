import {NewBytecode, PlBytecode, PlBytecodeType, PlProgram} from "./bytecode";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTBoolean,
    ASTCall,
    ASTClosure,
    ASTDict,
    ASTDot, ASTExport, ASTFor,
    ASTFunction,
    ASTIf,
    ASTImpl, ASTImport,
    ASTList, ASTLoop, ASTMatch,
    ASTNode,
    ASTNull,
    ASTNumber,
    ASTProgram,
    ASTReturn,
    ASTStatement,
    ASTString,
    ASTType,
    ASTUnary,
    ASTVariable, ASTWhile
} from "../compiler/parsing/ast";
import {NewPlDebugSingle, NewPlDebugStretch, PlDebug, PlDebugProgram} from "./debug";
import {PlTokenType} from "../compiler/lexing/token";

const METHOD_SEP = '@';
const ARITY_SEP = '/';

export type PlProgramWithDebug = { program: PlProgram, debug: PlDebugProgram };

export function EmitProgramWithDebug(ast: ASTProgram): PlProgramWithDebug {
    let programBuilder = new ProgramBuilder();
    for (const statement of ast) {
        programBuilder.addPWD(EmitStatementWithDebug(statement));
    }
    return programBuilder.toProgram();
}

export function EmitStatementWithDebug(statement: ASTStatement): PlProgramWithDebug {
    return (new ProgramBuilder())
        .addPWD(traverseAST(statement))
        .addBytecode(NewBytecode(PlBytecodeType.STKPOP))
        .toProgram();

}

class ProgramBuilder {
    code: PlBytecode[];
    debug: PlDebug[];
    line: number;

    constructor() {
        this.code = [];
        this.debug = [];
        this.line = 0;
    }

    addPWD(pair: PlProgramWithDebug, debug?: PlDebug) {
        this.code.push(...pair.program);
        pair.debug.forEach(d => {
            d.endLine += this.line;
        })
        this.debug.push(...pair.debug);
        this.line += pair.program.length;
        if (debug) {
            debug.endLine += this.line;
            this.debug.push(debug);
        }
        return this;
    }

    addPWDStretch(program: PlProgramWithDebug, node: ASTNode) {
        return this.addPWD(program, NewPlDebugStretch(node, this.code.length + program.program.length));
    }

    addBytecode(bc: PlBytecode, debug?: PlDebug) {
        this.code.push(bc);
        this.line += 1;
        if (debug) {
            debug.endLine += this.line;
            this.debug.push(debug);
        }
        return this;
    }


    addBytecodeStretch(bc: PlBytecode, node: ASTNode) {
        return this.addBytecode(bc, NewPlDebugStretch(node, this.code.length + 1));
    }

    addEmpty() {
        return this.addBytecode(NewBytecode(PlBytecodeType.DEFETY));
    }

    addStretch(node: ASTNode) {
        let debug = NewPlDebugStretch(node, this.code.length);
        debug.endLine += this.line;
        this.debug.push(debug);
        return this;
    }

    toProgram(): PlProgramWithDebug {
        return {program: this.code, debug: this.debug};
    }
}

function traverseAST(node: ASTNode): PlProgramWithDebug {
    if (node instanceof ASTNumber) {
        return (new ProgramBuilder()).addBytecode(makeNumber(node)).toProgram();
    } else if (node instanceof ASTVariable) {
        return (new ProgramBuilder()).addBytecode(makeEvalVariable(node)).toProgram();
    } else if (node instanceof ASTNull) {
        return (new ProgramBuilder()).addBytecode(makeNull(node)).toProgram();
    } else if (node instanceof ASTBoolean) {
        return (new ProgramBuilder()).addBytecode(makeBool(node)).toProgram();
    } else if (node instanceof ASTString) {
        return (new ProgramBuilder()).addBytecode(makeString(node)).toProgram();
    } else if (node instanceof ASTType) {
        return (new ProgramBuilder()).addBytecode(makeType(node)).toProgram();
    } else if (node instanceof ASTList) {
        let programBuilder = new ProgramBuilder();
        for (const item of node.values.reverse()) {
            programBuilder.addPWD(traverseAST(item));
        }
        return programBuilder
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, "" + node.values.length))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DEFLST), node)
            .toProgram();
    } else if (node instanceof ASTDict) {
        let programBuilder = new ProgramBuilder();
        for (let i = node.keys.length - 1; i >= 0; --i) {
            programBuilder.addPWD(traverseAST(node.values[i]));
            programBuilder.addPWD(traverseAST(node.keys[i]));
        }
        return programBuilder
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, "" + node.keys.length))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DEFDIC), node)
            .toProgram();
    } else if (node instanceof ASTAssign) {
        let programBuilder = new ProgramBuilder();
        programBuilder.addPWD(traverseAST(node.value));
        if (node.pre) {
            programBuilder.addPWD(traverseAST(node.pre));
        } else {
            programBuilder.addEmpty();
        }
        programBuilder.addBytecode(makeVariable(node.variable));
        programBuilder.addBytecodeStretch(NewBytecode(PlBytecodeType.DOASGN), node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTDot) {
        return (new ProgramBuilder())
            .addPWD(traverseAST(node.left))
            .addBytecode(makeVariable(node.right))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DOFIND), node)
            .toProgram();
    } else if (node instanceof ASTBinary) {
        if (node.operator.type == PlTokenType.AND) {
            let right = traverseAST(node.right);
            return (new ProgramBuilder())
                .addPWD(traverseAST(node.left))
                .addBytecode(NewBytecode(PlBytecodeType.JMPIFF, '' + (right.program.length + 1)))
                .addBytecode(NewBytecode(PlBytecodeType.STKPOP))
                .addPWDStretch(right, node)
                .toProgram();
        } else if (node.operator.type == PlTokenType.OR) {
            let right = traverseAST(node.right);
            return (new ProgramBuilder())
                .addPWD(traverseAST(node.left))
                .addBytecode(NewBytecode(PlBytecodeType.JMPIFT, '' + (right.program.length + 1)))
                .addBytecode(NewBytecode(PlBytecodeType.STKPOP))
                .addPWDStretch(right, node)
                .toProgram();
        }

        return (new ProgramBuilder())
            .addPWD(traverseAST(node.right))
            .addPWD(traverseAST(node.left))
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '2'))
            .addBytecode(NewBytecode(PlBytecodeType.DEFVAR, node.operator.content))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DOCALL), node)
            .toProgram();
    } else if (node instanceof ASTUnary) {
        if (node.operator.type == PlTokenType.INC) {
            return (new ProgramBuilder())
                .addBytecode(makeVariable(node.value as ASTVariable))
                .addBytecodeStretch(NewBytecode(PlBytecodeType.DOOINC), node)
                .toProgram();
        } else if (node.operator.type == PlTokenType.DEC) {
            return (new ProgramBuilder())
                .addBytecode(makeVariable(node.value as ASTVariable))
                .addBytecodeStretch(NewBytecode(PlBytecodeType.DOODEC), node)
                .toProgram();
        }
        return (new ProgramBuilder())
            .addPWD(traverseAST(node.value))
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '1'))
            .addBytecode(NewBytecode(PlBytecodeType.DEFVAR, node.operator.content))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DOCALL), node)
            .toProgram();
    } else if (node instanceof ASTReturn) {
        let programBuilder = new ProgramBuilder();
        if (node.content) {
            programBuilder.addPWD(traverseAST(node.content));
        } else {
            programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFNUL));
        }
        return programBuilder.addBytecode(NewBytecode(PlBytecodeType.DORETN))
            .addEmpty()
            .addStretch(node)
            .toProgram();
    } else if (node instanceof ASTFunction) {
        let programBuilder = new ProgramBuilder();
        programBuilder.addPWD(makeBlock(node.block));
        for (const param of node.args) {
            programBuilder.addBytecode(makeVariable(param));
        }
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '' + node.args.length));
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFFUN));
        programBuilder.addEmpty();
        const value = `${node.name.content}${ARITY_SEP}${node.args.length}`;
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFSTR, value));
        programBuilder.addBytecodeStretch(NewBytecode(PlBytecodeType.DOASGN), node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTClosure) {
        let programBuilder = new ProgramBuilder();
        programBuilder.addPWD(makeBlock(node.block));
        for (const param of node.args) {
            programBuilder.addBytecode(makeVariable(param));
        }
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '' + node.args.length));
        programBuilder.addBytecodeStretch(NewBytecode(PlBytecodeType.DEFFUN), node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTImpl) {
        let programBuilder = new ProgramBuilder();
        programBuilder.addPWD(makeBlock(node.block));
        for (const param of node.args) {
            programBuilder.addBytecode(makeVariable(param));
        }
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '' + node.args.length));
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFFUN));
        programBuilder.addEmpty();
        const value = `${node.target.content}${node.name.content.startsWith(METHOD_SEP) ? '' : METHOD_SEP}${node.name.content}${ARITY_SEP}${node.args.length}`;
        programBuilder.addBytecode(NewBytecode(PlBytecodeType.DEFSTR, value));
        programBuilder.addBytecodeStretch(NewBytecode(PlBytecodeType.DOASGN), node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTCall) {
        let programBuilder = new ProgramBuilder();
        for (const arg of node.args) {
            programBuilder.addPWD(traverseAST(arg));
        }
        programBuilder
            .addBytecode(NewBytecode(PlBytecodeType.DEFNUM, '' + node.args.length))
            .addPWD(traverseAST(node.target))
            .addBytecodeStretch(NewBytecode(PlBytecodeType.DOCALL), node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTBlock) {
        return (new ProgramBuilder())
            .addPWD(makeEvalBlock(node))
            .addEmpty()
            .addStretch(node)
            .toProgram();
    } else if (node instanceof ASTIf) {
        let programBuilder = new ProgramBuilder();
        for (let i = 0; i < node.conditions.length; ++i) {
            let condition = traverseAST(node.conditions[i]);
            let block = makeEvalBlock(node.blocks[i]);

            // emit continuous jumps for success conditions
            if (i != 0) {
                programBuilder
                    .addBytecode(NewBytecode(PlBytecodeType.JMPREL, '' + (condition.program.length + 1 + block.program.length)));
            }

            let length = block.program.length + 1; // skip the jmprel in the next condition or 'else'
            if (node.conditions.length - i == 1 && !node.other) {
                length -= 1; // don't skip the jmprel if there is no next condition or 'else'
            }

            programBuilder
                .addPWD(condition, NewPlDebugSingle(node.conditions[i]))
                .addBytecode(NewBytecode(PlBytecodeType.JMPICF, '' + length))
                .addPWD(block);
        }
        if (node.other) {
            let other = makeEvalBlock(node.other);
            programBuilder
                .addBytecode(NewBytecode(PlBytecodeType.JMPREL, '' + other.program.length))
                .addPWD(other);
        }
        programBuilder
            .addEmpty()
            .addStretch(node);
        return programBuilder.toProgram();
    } else if (node instanceof ASTFor) {

    } else if (node instanceof ASTWhile) {

    } else if (node instanceof ASTLoop) {

    } else if (node instanceof ASTImport) {

    } else if (node instanceof ASTExport) {

    } else if (node instanceof ASTMatch) {

    }

    console.log("DEBUG WARNING!");
    return (new ProgramBuilder()
        .addBytecode(NewBytecode(PlBytecodeType.DEFNUL))
        .addBytecode(NewBytecode(PlBytecodeType.DORETN))).toProgram();
}

function makeNumber(node: ASTNumber) {
    return NewBytecode(PlBytecodeType.DEFNUM, '' + node.value);
}

function makeEvalVariable(node: ASTVariable) {
    return NewBytecode(PlBytecodeType.DEFVAR, node.content);
}

function makeVariable(node: ASTVariable) {
    return NewBytecode(PlBytecodeType.DEFSTR, node.content);
}

function makeNull(node: ASTNull) {
    return NewBytecode(PlBytecodeType.DEFNUL, null);
}

function makeBool(node: ASTBoolean) {
    return NewBytecode(PlBytecodeType.DEFBOL, "" + +node.value);
}

function makeString(node: ASTString) {
    return NewBytecode(PlBytecodeType.DEFSTR, `"${node.content}"`);
}

function makeType(node: ASTType) {
    return NewBytecode(PlBytecodeType.DEFTYP, `'${node.content}'`);
}

function makeBlock(node: ASTBlock): PlProgramWithDebug {
    let statements = EmitProgramWithDebug(node.statements);
    return (new ProgramBuilder())
        .addBytecode(NewBytecode(PlBytecodeType.BLOCRT, '' + statements.program.length))
        .addPWDStretch(EmitProgramWithDebug(node.statements), node)
        .toProgram();
}

function makeEvalBlock(node: ASTBlock): PlProgramWithDebug {
    return (new ProgramBuilder())
        .addBytecode(NewBytecode(PlBytecodeType.BLOENT))
        .addPWD(EmitProgramWithDebug(node.statements))
        .addBytecode(NewBytecode(PlBytecodeType.BLOEXT))
        .toProgram();
}