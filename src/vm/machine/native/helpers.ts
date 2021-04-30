import {ScrambleFunction} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../stuff";

export function assertTypeof(value: any, type: string, message: string) {
    if (typeof value != type) {
        throw new Error(message);
    }
}

export function assertType(value: PlStuff, type: PlStuffType, message: string) {
    if (value.type != type) {
        throw new Error(message);
    }
}

export function assertTypeofEqual(closure: Function) {
    return (l, r) => {
        if (typeof l != typeof r) {
            throw new Error("the types on each side of the operator are not the same");
        }
        return closure(l, r);
    }
}

export function assertTypeEqual(closure: Function) {
    return (l, r) => {
        if (l.type != r.type) {
            throw new Error("the types on each side of the operator are not the same");
        }
        return closure(l, r);
    }
}


export function expectedNArguments(n: number, args: IArguments, type: boolean = true) {
    let got = args.length;
    if (type)
        --got;
    if (n != got) {
        throw new Error(`incorrect arity for a function call, needed ${n} but got ${got}`);
    }
}

function wrapBool(value: Function) {
    return (...args) => {
        return value(...args) == true ? PlStuffTrue : PlStuffFalse;
    }
}

export function generateCompare(type: PlStuffType, eq: Function | null = null, gt: Function | null = null) {
    let out = {};
    if (eq != null) {
        out = {
            ...out,
            [ScrambleFunction("==", type)]: wrapBool(eq),
            [ScrambleFunction("/=", type)]: wrapBool((l, r) => !eq(l, r)),
        };
    }
    if (gt != null) {
        out = {
            ...out,
            [ScrambleFunction(">", type)]: wrapBool(gt),
            [ScrambleFunction("<=", type)]: wrapBool((l, r) => !gt(l, r)),
        };
    }
    if (eq != null && gt != null) {
        out = {
            ...out,
            [ScrambleFunction("<", type)]: wrapBool((l, r) => !eq(l, r) && !gt(l, r)),
            [ScrambleFunction(">=", type)]: wrapBool((l, r) => eq(l, r) || gt(l, r)),
        };
    }
    return out;
}


export function generateForAll(name: string, func: Function) {
    const out = {};
    for (const item in PlStuffType) {
        if (!isNaN(Number(item))) {
            out[ScrambleFunction(name, +item)] = func;
        }
    }
    return out;
}

export function generateForSome(name: string, types: PlStuffType[], func: Function) {
    const out = {};
    for (const item in PlStuffType) {
        if (!isNaN(Number(item))) {
            if (types.includes(+item)) {
                out[ScrambleFunction(name, +item)] = func;
            }
        }
    }
    return out;
}


export type ExportNative = Record<string, (...args: PlStuff[]) => PlStuff>;
export type ExportJs = Record<string, (...args: any[]) => any>;
