import PlToken from "../compiler/lexing/token";

export enum PlBytecodeType {

    // push x onto the stack
    DEFNUM, // <number>, push number
    DEFVAR, // <string>, push string
    DEFFUN, // <order> pop arity, pop parameters, create block until CLSFUN <order>, push function
    DEFNUL,
    DEFBOL,
    DEFSTR,
    DEFTYP,
    DEFETY,

    // functional
    DOCALL, // pop arity, pop arguments, push ret
    DORETN, // pop expression
    DOASGN,
    DOFIND,

    // logical sc
    DOLAND,
    DOLOR_,
    DOLNOT,

    OPNBLO,
    CLSBLO,
    CLSLOG,


    // todo: more operations here
    // think about blocks,
}

// https://stackoverflow.com/questions/18111657/how-to-get-names-of-enum-entries
const allEnumKeys = [];
for (const mem in PlBytecodeType) {
    if (parseInt(mem, 10) >= 0) {
        allEnumKeys.push(PlBytecodeType[mem]);
    }
}

export interface PlBytecode {
    type: PlBytecodeType;
    value: string | null;
    token: PlToken | null;
}
export type PlProgram = PlBytecode[];

export function NewBytecode(type: PlBytecodeType, value: string | null = null, token: PlToken | null = null): PlBytecode {
    return {
        type,
        value,
        token
    };
}

export function ProgramToPlb(program: PlProgram): string {
    const out = [];
    for (const bc of program) {
        out.push(`${allEnumKeys[bc.type]}` + (bc.value == null ? '' : ` |${bc.value}|`));
    }
    return out.join('\n');
}

export function PlbToProgram() {

}
