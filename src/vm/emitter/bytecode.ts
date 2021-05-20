import {escapeString} from "../../extension";

export enum PlBytecodeType {

    DEFNUM,
    DEFVAR,
    DEFFUN,
    DEFNUL,
    DEFBOL,
    DEFSTR,
    DEFTYP,
    DEFETY,
    DEFLST,
    DEFDIC,

    JMPIFT,
    JMPIFF,
    JMPICT, // unused
    JMPICF,
    JMPREL,

    DOCALL,
    DORETN,
    DOASGN,
    DOCRET,
    DOFIND,
    DOOINC,
    DOODEC,
    DONEGT,
    DOLNOT,
    DOBRAK,
    DOCONT,

    STKPOP,
    STKENT,
    STKEXT

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
}
export type PlProgram = PlBytecode[];

export function NewBytecode(type: PlBytecodeType, value: string | null = null): PlBytecode {
    return {
        type,
        value
    };
}

export function BytecodeToString(bc: PlBytecode) {
    return `${allEnumKeys[bc.type]}` + (bc.value == null ? '' : ` |${escapeString(bc.value)}|`);
}

