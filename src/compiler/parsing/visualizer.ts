import {
    ASTAssign,
    ASTBinary,
    ASTBlock, ASTBreak,
    ASTCall, ASTClosure, ASTContinue,
    ASTDict,
    ASTDot, ASTEach, ASTExport, ASTFor, ASTFunction, ASTIf, ASTImpl, ASTImport,
    ASTList, ASTLoop, ASTMatch,
    ASTNode, ASTNumber,
    ASTProgram, ASTReturn, ASTString, ASTType,
    ASTUnary, ASTWhile
} from "./ast";
import { PlTokenType } from "../lexing/token";
import {colors, PlColors} from "../../inout/color";
import { IsPreLower } from "./ops";

const PPINDENT = 4;

const HIGHLIGHT_TYPES = ["kw", "sr", "mt", "nu", "op"] as const;
export const HIGHLIGHT: Record<typeof HIGHLIGHT_TYPES[number], PlColors> = {
    kw: 'magenta',
    sr: 'green',
    mt: 'yellow',
    nu: 'cyan',
    op: "white",
};

let c = {
    kw: colors[HIGHLIGHT.kw],
    sr: colors[HIGHLIGHT.sr],
    mt: colors[HIGHLIGHT.mt],
    nu: colors[HIGHLIGHT.nu],
    op: colors[HIGHLIGHT.op],
};

/**
 * Return a colored **formatted** string of the ast tree
 * @param program The AST Tree
 * @constructor
 */
export function ASTProgramToString(program: ASTProgram ): string {
    return program.map( statement => ats( statement ) ).join( "\n\n" );
}

function indentString(input: string, amount: number = PPINDENT) {
    return input.split( '\n' ).map( l => ' '.repeat( amount ) + l ).join( '\n' );
}

function atss( nodes: ASTNode[], join: string = ', ' ): string {
    return nodes.map( n => ats( n ) ).join( join );
}

function ats( node: ASTNode | null ): string {
    if ( node == null ) {
        return '';
    }
    if ( node instanceof ASTBlock ) {
        if (node.statements.length == 0) {
            return '{}';
        }
        const inside = node.statements.map( n => indentString(ats( n )) ).join( '\n' );
        return `{\n${inside}\n}`;
    } else if ( node instanceof ASTBinary ) {
        const left = ats( node.left );
        const right = ats( node.right );
        if ( node.left instanceof ASTBinary ) {
            if ( IsPreLower( node.operator.type, node.left.operator.type ) ) {
                return `(${left}) ${node.operator.content} ${right}`;
            }
        }
        return `${left} ${node.operator.content} ${right}`;
    } else if ( node instanceof ASTUnary ) {
        const value = ats( node.value );
        const op = node.operator;
        if ( op.type == PlTokenType.INC || op.type == PlTokenType.DEC) {
            return `${value}${op.content}`;
        }
        if (op.type == PlTokenType.NOT) {
            return `${op.content} ${value}`;
        }
        return `${op.content}${value}`;
    } else if ( node instanceof ASTList ) {
        return `${c.mt( 'list' )}(${node.values.map( v => ats( v ) ).join( ', ' )})`;
    } else if ( node instanceof ASTDict ) {
        return `${c.mt( 'dict' )}(\n${indentString(node.keys.map( ( k, i ) =>  ats( k ) + ': ' + ats( node.values[i] ) ).join( ',\n' ))}\n)`;
    } else if (node instanceof ASTType) {
        return `${c.kw('type')} ${ats(node.name)} (\n${indentString(node.members.map(m => ats(m)).join(',\n'))}\n)`
    } else if ( node instanceof ASTCall ) {
        if ( node.target instanceof ASTDot ) {
            return `${ats( node.target.left )}.${c.mt( ats( node.target.right ) )}(${node.args.map( v => ats( v ) ).join( ', ' )})`;
        }
        return `${c.mt( ats( node.target ) )}(${node.args.map( v => ats( v ) ).join( ', ' )})`;
    } else if ( node instanceof ASTAssign ) {
        let out = "";
        if ( node.pre ) {
            out += ats( node.pre ) + ".";
        }
        out += `${ats( node.variable )} = ${ats( node.value )}`;
        return out;
    } else if ( node instanceof ASTDot ) {
        return `${ats( node.left )}.${ats( node.right )}`;
    } else if ( node instanceof ASTFunction ) {
        return `${c.kw( 'func' )} ${ats( node.name )}(${atss( node.args )}) ${ats( node.block )}`;
    } else if ( node instanceof ASTImpl ) {
        return `${c.kw( 'impl' )} ${ats( node.name )}(${atss( node.args )}) ${c.kw( 'for' )} ${ats( node.target )} ${ats( node.block )}`;
    } else if ( node instanceof ASTImport ) {
        let out = `${c.kw( 'import' )} ${atss( node.path, '/' )}`;
        if ( node.alias ) {
            out += ` ${c.kw( 'as' )} ${ats( node.alias )}`;
        } else if ( node.select ) {
            out += ` ${c.kw( 'select' )} ${atss( node.select )}`;
            if (node.select.length == 0) {
                out += '*';
            }
        }
        return out;
    } else if ( node instanceof ASTExport ) {
        return `${c.kw( 'export' )} ${ats( node.content )}`;
    } else if ( node instanceof ASTReturn ) {
        return `${c.kw( 'return' )} ${ats( node.content )}`;
    } else if ( node instanceof ASTIf ) {
        let out = node.conditions.map( ( e, i ) => {
            let text = `${ats( e )} ${ats( node.blocks[i] )}`;
            if ( i == 0 ) {
                text = c.kw( 'if' ) + ' ' + text;
            } else {
                text = c.kw( 'elif' ) + ' ' + text;
            }
            return text;
        } ).join( ' ' );
        if ( node.other ) {
            out += ` ${c.kw( 'else' )} ${ats( node.other )}`;
        }
        return out;
    } else if ( node instanceof ASTEach ) {
        let out = `${c.kw( 'each' )} ${ats( node.value )}`;
        if ( node.key ) {
            out += `, ${ats( node.key )}`;
        }
        return out + ` ${c.kw( 'in' )} ${ats( node.iterator )} ${ats( node.block )}`;
    } else if ( node instanceof ASTLoop ) {
        let out = `${c.kw( 'loop' )}`;
        if ( node.amount ) {
            out += ` ${ats( node.amount )}`;
        }
        return out + ` ${ats( node.block )}`;
    } else if ( node instanceof ASTWhile ) {
        return `${c.kw( 'while' )} ${ats( node.condition )} ${ats( node.block )}`;
    } else if ( node instanceof ASTFor ) {
        return `${c.kw( 'for' )} ${ats( node.start )}; ${ats( node.condition )}; ${ats( node.after )} ${ats( node.block )}`;
    } else if ( node instanceof ASTMatch ) {
        let cases = node.cases.map( ( e, i ) => {
            return indentString(`${c.kw( 'case' )} ${atss( e )} ${ats( node.blocks[i] )}`);
        } ).join( '\n' );
        let other = '';
        if ( node.other ) {
            other = indentString(`\n${c.kw( 'default' )} ${ats( node.other )}`);
        }
        return `${c.kw( 'match' )} ${ats( node.value )} {\n${cases}${other}\n}`;
    } else if ( node instanceof ASTString ) {
        return c.sr( `"${node.content}"` );
    } else if ( node instanceof ASTClosure ) {
        return `${c.kw( 'func' )}(${atss( node.args )}) ${ats( node.block )}`;
    } else if ( node instanceof ASTNumber ) {
        return c.nu( node.value );
    } else if (node instanceof ASTBreak || node instanceof ASTContinue) {
        return c.kw(node.getSpanToken().content);
    } else {
        return node.getSpanToken().content;
    }
}
