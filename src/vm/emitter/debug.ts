import {ASTNode} from "../../compiler/parsing/ast";
import PlToken from "../../compiler/lexing/token";

export type PlDebugProgram = PlDebug[];

export interface PlDebug {
    span: PlToken;
    name: string;
    endLine: number;
    length: number;
}

export function NewPlDebug(node: ASTNode, endLine: number, length: number): PlDebug {
    return {
        span: node.getSpanToken(),
        name: (node as any).constructor.name,
        endLine,
        length
    }
}

export function NewPlDebugSingle(node: ASTNode): PlDebug {
    return NewPlDebug(node, 0, 1);
}

export function NewPlDebugStretch(node: ASTNode, length: number) {
    return NewPlDebug(node, 0, length);
}

export function PlDebugToString(debug: PlDebug): string {
    return debug.name;
}