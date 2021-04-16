import PlToken from "../compiler/lexing/token";

export enum PlBytecodeType {
    RETURN,

    DEFNUM,
    DEFVAR,

    DOADD,
    DOSUB,
    DOMUL,
    DODIV,

    // todo: more operations here
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
    value: string;
    token: PlToken | null;
}
export type PlProgram = PlBytecode[];

export function NewBytecode(type: PlBytecodeType, value: string, token: PlToken | null): PlBytecode {
    return {
        type,
        value,
        token
    };
}

export function ProgramToPlb(program: PlProgram): string {
    const out = [];
    for (const bc of program) {
        out.push(`${allEnumKeys[bc.type]}` + (bc.value == '' ? '' : ` "${bc.value}"`));
    }
    return out.join('\n');
}

export function PlbToProgram() {

}
