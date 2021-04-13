import {
    ASTAssign,
    ASTBinary,
    ASTBlock,
    ASTCall, ASTClosure,
    ASTDict,
    ASTDot, ASTEach, ASTExport, ASTFor, ASTFunction, ASTIf, ASTImpl, ASTImport,
    ASTList, ASTLoop, ASTMatch,
    ASTNode,
    ASTProgram, ASTReturn, ASTString,
    ASTUnary, ASTWhile
} from "./ast";
import {PlTokenType} from "../lexing/token";
import {colors} from "../../inout/color";
import { IsPreLower } from "./ops";

const PPINDENT = 4;

let c = {
    kw: colors.magenta,
    sr: colors.green,
    mt: colors.yellow,
};

export function AttemptPrettyPrint(program: ASTProgram): string {
    return program.map(statement => ats(statement)).join("\n\n");
}

function atss(nodes: ASTNode[], join: string = ', '): string {
    return nodes.map(n => ats(n)).join(join);
}

function ats(node: ASTNode | null): string {
    if (node == null) {
        return '';
    }
    if (node instanceof ASTBlock) {
        const inside = node.statements.map(n => ats(n).split('\n').map(l => ' '.repeat(PPINDENT) + l).join('\n')).join('\n');
        return `{\n${inside}\n}`;
    } else if (node instanceof ASTBinary) {
        const left = ats(node.left);
        const right = ats(node.right);
        if (node.right instanceof ASTBinary) {
            if (IsPreLower(node.operator.type, node.right.operator.type)) {
                return `${left} ${node.operator.content} (${right})`;
            }
        }

        return `${left} ${node.operator.content} ${right}`;
    } else if (node instanceof ASTUnary) {
        const value = ats(node.value);
        const op = node.operator;
        if (op.type == PlTokenType.INC || op.type == PlTokenType.DEC) {
            return `${value} ${op.content}`;
        }
        return `${op.content} ${value}`;
    } else if (node instanceof ASTList) {
        return `${c.mt('list')}(${node.values.map(v => ats(v)).join(', ')})`;
    } else if (node instanceof ASTDict) {
        return `${c.mt('dict')}(${node.keys.map((k, i) => ats(k) + ': ' + ats(node.values[i])).join(', ')})`;
    } else if (node instanceof ASTCall) {
        if (node.target instanceof ASTDot) {
            return `${ats(node.target.left)}.${c.mt(ats(node.target.right))}(${node.args.map(v => ats(v)).join(', ')})`;
        }
        return `${c.mt(ats(node.target))}(${node.args.map(v => ats(v)).join(', ')})`;
    } else if (node instanceof ASTAssign) {
        let out = "";
        if (node.pre) {
            out += ats(node.pre) + ".";
        }
        out += `${ats(node.variable)} = ${ats(node.value)}`;
        return out;
    } else if (node instanceof ASTDot) {
        return `${ats(node.left)}.${ats(node.right)}`;
    } else if (node instanceof ASTFunction) {
        return `${c.kw('func')} ${ats(node.name)}(${atss(node.args)}) ${ats(node.block)}`;
    } else if (node instanceof ASTImpl) {
        return `${c.kw('impl')} ${ats(node.name)}(${atss(node.args)}) ${c.kw('for')} ${ats(node.target)} ${ats(node.block)}`;
    } else if (node instanceof ASTImport) {
        let out = `${c.kw('import')} ${atss(node.path, '/')}`;
        if (node.alias) {
            out += ` ${c.kw('as')} ${ats(node.alias)}`;
        } else if (node.select) {
            out += ` ${c.kw('select')} ${atss(node.select)}`;
        }
        return out;
    } else if (node instanceof ASTExport) {
        return `${c.kw('export')} ${ats(node.content)}`;
    } else if (node instanceof ASTReturn) {
        return `${c.kw('return')} ${ats(node.content)}`;
    } else if (node instanceof ASTIf) {
        let out = node.conditions.map((e, i) => {
            let text = `${ats(e)} ${ats(node.blocks[i])}`;
            if (i == 0) {
                text = c.kw('if') + ' ' + text;
            } else {
                text = c.kw('elif') + ' ' + text;
            }
            return text;
        }).join(' ');
        if (node.other) {
            out += ` ${c.kw('else')} ${ats(node.other)}`;
        }
        return out;
    } else if (node instanceof ASTEach) {
        let out = `${c.kw('each')} ${ats(node.value)}`;
        if (node.key) {
            out += `, ${ats(node.key)}`;
        }
        return out + ` ${c.kw('in')} ${ats(node.iterator)} ${ats(node.block)}`;
    } else if (node instanceof ASTLoop) {
        let out = `${c.kw('loop')}`;
        if (node.amount) {
            out += ` ${ats(node.amount)}`;
        }
        return out + ` ${ats(node.block)}`;
    } else if (node instanceof ASTWhile) {
        return `${c.kw('while')} ${ats(node.condition)} ${ats(node.block)}`;
    } else if (node instanceof ASTFor) {
        return `${c.kw('for')} ${ats(node.start)}; ${ats(node.condition)}; ${ats(node.after)} ${ats(node.block)}`;
    } else if (node instanceof ASTMatch) {
        let cases = node.cases.map((e, i) => {
            return `${c.kw('case')} ${atss(e)} ${ats(node.blocks[i])}`.split('\n').map(l => ' '.repeat(PPINDENT) + l).join('\n');
        }).join('\n');
        let other = '';
        if (node.other) {
            other = `\n${c.kw('default')} ${ats(node.other)}`.split('\n').map(l => ' '.repeat(PPINDENT) + l).join('\n');
        }
        return `${c.kw('match')} ${ats(node.value)} {\n${cases}${other}\n}`;
    } else if (node instanceof ASTString) {
        return c.sr(`"${node.content}"`);
    } else if (node instanceof ASTClosure) {
        return `${c.kw('func')}(${atss(node.args)}) ${ats(node.block)}`;
    } else {
        return node.getSpanToken().content;
    }
}
