import { ASTNode } from "../../compiler/parsing/ast";
import PlToken from "../../compiler/lexing/token";


export interface PlDebug {
    span: PlToken;
    name: string;
    endLine: number;
    length: number;
}
export type PlDebugProgram = PlDebug[];

export function NewPlDebug( node: ASTNode, endLine: number, length: number ): PlDebug {
    const name = node.attribute == null ? (node as any).constructor.name : node.attribute;
    return {
        span: node.getSpanToken(),
        name,
        endLine,
        length
    }
}

export function NewPlDebugSingle( node: ASTNode ): PlDebug {
    return NewPlDebug( node, 0, 1 );
}

export function NewPlDebugStretch( node: ASTNode, length: number ) {
    return NewPlDebug( node, 0, length );
}

export function PlDebugToString( debug: PlDebug ): string {
    return `${debug.name}@${debug.span.info.row}:${debug.span.info.col}`;
}

export function PlDebugWithin( debug: PlDebug, start: number, end: number ): boolean {
    return debug.endLine <= end && (debug.endLine - debug.length) >= start;
}

export function PlDebugProgramWithin( debug: PlDebugProgram, start: number, end: number ): PlDebugProgram {
    const debugs = []
    for ( const info of debug ) {
        if ( PlDebugWithin( info, start, end ) ) {
            debugs.push( info );
        }
    }
    return debugs;
}
