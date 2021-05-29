import {dddString, escapeString} from "../../extension";
import {tsEnumKeys} from "../../extension/tstypes";

/**
 * Types of bytecodes
 */
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
const allEnumKeys = tsEnumKeys(PlBytecodeType); // List of all bytecode types as an array


export interface PlBytecode {
    type: PlBytecodeType;
    value: string | null;
}

export function NewBytecode(type: PlBytecodeType, value: string | null = null): PlBytecode {
    return {
        type,
        value
    };
}

export function BytecodeToString(bc: PlBytecode) {
    return `${allEnumKeys[bc.type]}` + (bc.value == null ? '' : ` |${dddString(escapeString(bc.value), 7)}|`);
}

