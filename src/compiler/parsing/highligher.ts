import {HIGHLIGHT} from "./visualizer";
import {
    ASTAssign,
    ASTBinary,
    ASTBlock, ASTBoolean, ASTBreak,
    ASTCall,
    ASTClosure, ASTContinue,
    ASTCreate,
    ASTDict,
    ASTDot,
    ASTEach,
    ASTFor,
    ASTFunction,
    ASTIf,
    ASTImpl,
    ASTList,
    ASTLoop,
    ASTMatch,
    ASTNode, ASTNull, ASTNumber,
    ASTProgram,
    ASTReturn,
    ASTString,
    ASTType,
    ASTUnary,
    ASTWhile
} from "./ast";
import {colors, PlColors} from "../../inout/color";
import {PlFileInfo} from "../lexing/info";
import {PlTokenType} from "../lexing/token";

interface PlColorRegion {
    info: PlFileInfo,
    color: PlColors;
}

function NewPlColorRegion(info, color: PlColors): PlColorRegion {
    return {
        info,
        color
    };
}

function regionFits(row: number, col: number, region: PlColorRegion): boolean {
    return row == region.info.row && (col >= (region.info.col - region.info.length) && col < (region.info.col));
}

/**
 * Generate the coloring regions from the ast program
 * @param ast The AST Tree
 */
export function ASTProgramToColorRegions(ast: ASTProgram): PlColorRegion[] {
    const regions: PlColorRegion[] = [];

    function visitor(node: ASTNode) {
        if (node instanceof ASTString) {
            const info = node.getSpanToken().info;
            regions.push(NewPlColorRegion(info, HIGHLIGHT.sr));
        } else if (node instanceof ASTImpl) {
            let info = node.tokens[0].info;
            regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
            info = node.tokens[1].info;
            regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
        } else if (node instanceof ASTIf) {
            for (let i = 0; i < node.conditions.length; i++) {
                const info = node.tokens[i].info;
                regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
            }
            if (node.other) {
                const info = node.tokens[node.tokens.length - 1].info;
                regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
            }
        } else if (node instanceof ASTReturn) {
            if (node.tokens.length > 0) {
                const info = node.tokens[0].info;
                regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
            }
        } else if (node instanceof ASTBinary) {
            const info = node.operator.info;
            if (node.operator.type == PlTokenType.AND || node.operator.type == PlTokenType.OR) {
                regions.push(NewPlColorRegion(info, HIGHLIGHT.kw));
            } else {
                regions.push(NewPlColorRegion(info, HIGHLIGHT.mt));
            }
        } else if (node instanceof ASTAssign || node instanceof ASTCreate) {
            const info = node.tokens[0].info;
            regions.push(NewPlColorRegion(info, HIGHLIGHT.mt));
        } else if (node instanceof ASTEach) {
            regions.push(NewPlColorRegion(node.tokens[0].info, HIGHLIGHT.kw));
            regions.push(NewPlColorRegion(node.tokens[1].info, HIGHLIGHT.kw));
        } else if (node instanceof ASTLoop) {
            regions.push(NewPlColorRegion(node.tokens[0].info, HIGHLIGHT.kw));
        } else if (node instanceof ASTCall) {
            regions.push(NewPlColorRegion(node.target.lastToken().info, HIGHLIGHT.mt));
        } else if (node instanceof ASTBreak || node instanceof ASTContinue
            || node instanceof ASTBoolean || node instanceof ASTNull
            || node instanceof ASTFor || node instanceof ASTWhile || node instanceof ASTLoop
            || node instanceof ASTFunction || node instanceof ASTType || node instanceof ASTClosure
            || node instanceof ASTList || node instanceof ASTDict) {
            regions.push(NewPlColorRegion(node.tokens[0].info, HIGHLIGHT.kw));
        } else if (node instanceof ASTNumber) {
            regions.push(NewPlColorRegion(node.getSpanToken().info, HIGHLIGHT.nu));
        } else if (node instanceof ASTUnary) {
            regions.push(NewPlColorRegion(node.operator.info, HIGHLIGHT.mt));
        }

    }

    for (const s of ast) {
        visit(s, visitor);
    }

    return regions.sort((r1, r2) => {
        if (r1.info.row > r2.info.row) {
            return 1;
        }
        if (r2.info.row > r1.info.row) {
            return -1;
        }

        const r1col = r1.info.col - r1.info.length;
        const r2col = r2.info.col - r2.info.length;
        if (r1col > r2col)
            return 1;
        if (r2col > r1col)
            return -1;

        return 0;
    });
}

/**
 * Returns a highlighted content string by use of the regions, using inout.color to color
 * @param regions The color regions
 * @param content The source code
 */
export function ASTProgramHighlight(regions: PlColorRegion[], content: string): string {
    const source = content.split('\n');
    let out = '';

    let regionOffset = 0;

    let state = null;
    for (let row = 0; row < source.length; row++) {
        const text = source[row];
        for (let col = 0; col < text.length; col++) {
            const newRegion = regions[regionOffset];
            const oldRegion = regions[regionOffset - 1];
            if (newRegion != null && regionFits(row, col, newRegion)) {
                state = newRegion.color;
                regionOffset += 1;
            } else if (oldRegion != null && !regionFits(row, col, oldRegion)) {
                state = null;
            }

            if (state == null) {
                out += text[col];
            } else {
                out += colors[state](text[col]);
            }
        }
        out += '\n';
    }
    return out;
}


function visit(node: ASTNode | null, closure: (node: ASTNode) => void) {
    if (node === null || node === undefined) {
        return;
    }

    closure(node);
    if (node instanceof ASTBlock) {
        for (const s of node.statements) {
            visit(s, closure);
        }
    } else if (node instanceof ASTBinary) {
        visit(node.left, closure);
        visit(node.right, closure);
    } else if (node instanceof ASTUnary) {
        visit(node.value, closure);
    } else if (node instanceof ASTList) {
        for (const v of node.values) {
            visit(v, closure);
        }
    } else if (node instanceof ASTDict) {
        for (const v of Object.values(node.values)) {
            visit(v, closure);
        }
    } else if (node instanceof ASTType) {
        visit(node.name, closure);
        for (const m of node.members) {
            visit(m, closure);
        }
    } else if (node instanceof ASTCall) {
        visit(node.target, closure);
        for (const a of node.args) {
            visit(a, closure);
        }
    } else if (node instanceof ASTDot) {
        visit(node.left, closure);
        visit(node.right, closure);
    } else if (node instanceof ASTFunction) {
        visit(node.name, closure);
        for (const a of node.args) {
            visit(a, closure);
        }
        visit(node.block, closure);
    } else if (node instanceof ASTImpl) {
        visit(node.name, closure);
        for (const a of node.args) {
            visit(a, closure);
        }
        visit(node.block, closure);
    } else if (node instanceof ASTReturn) {
        visit(node.content, closure);
    } else if (node instanceof ASTIf) {
        for (let i = 0; i < node.conditions.length; i++) {
            visit(node.conditions[i], closure);
            visit(node.blocks[i], closure);
        }
        visit(node.other, closure);
    } else if (node instanceof ASTWhile) {
        visit(node.condition, closure);
        visit(node.block, closure);
    } else if (node instanceof ASTFor) {
        visit(node.start, closure);
        visit(node.condition, closure);
        visit(node.after, closure);
        visit(node.block, closure);
    } else if (node instanceof ASTMatch) {
        visit(node.value, closure);
        for (let i = 0; i < node.cases.length; i++) {
            for (const cond of node.cases[i]) {
                visit(cond, closure);
            }
            visit(node.blocks[i], closure);
        }
    } else if (node instanceof ASTClosure) {
        for (const a of node.args) {
            visit(a, closure);
        }
        visit(node.block, closure);
    } else if (node instanceof ASTEach) {
        visit(node.key, closure);
        visit(node.value, closure);
        visit(node.iterator, closure);
        visit(node.block, closure);
    } else if (node instanceof ASTLoop) {
        visit(node.amount, closure);
        visit(node.block, closure);
    } else if (node instanceof ASTAssign || node instanceof ASTCreate) {
        visit(node.pre, closure);
        visit(node.variable, closure);
        visit(node.value, closure);
    }
    // remaining don't have nested elements
}