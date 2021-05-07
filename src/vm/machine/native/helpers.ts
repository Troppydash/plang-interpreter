import {ScrambleFunction} from "../scrambler";
import {
    PlStuff,
    PlStuffFalse,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeFromJsString,
    PlStuffTypeFromString,
    PlStuffTypeToString
} from "../stuff";
import {MakeArityMessage, MakeOperatorMessage, MakeTypeMessage} from "./messeger";
import {TypeofTypes} from "../../../extension";
import {PlConverter} from "./converter";
import JsToPl = PlConverter.JsToPl;

export function AssertTypeof(name: string, got: any, expected: TypeofTypes, position: number = 1) {
    if (typeof got != expected) {
        throw new Error(MakeTypeMessage(name, PlStuffTypeFromJsString(expected), JsToPl(got, ()=>{}), position));
    }
}

export function AssertType(name: string, got: PlStuff, expected: PlStuffType, position: number = 1) {
    if (got.type != expected) {
        throw new Error(MakeTypeMessage(name, expected, got, position));
    }
}

export function AssertOperatorsSide(name: string, closure: Function) {
    return (l, r) => {
        if (typeof l != typeof r) {
            throw new Error(MakeOperatorMessage(name, JsToPl(l, ()=>{}).type, JsToPl(r, ()=>{}).type));
        }
        return closure(l, r);
    }
}

export function AssertTypeEqual(name: string, closure: Function) {
    return (l, r) => {
        if (l.type != r.type) {
            throw new Error(MakeOperatorMessage(name, l.type, r.type));
        }
        return closure(l, r);
    }
}


export function ExpectedNArguments(name: string, got: number, expected: number) {
    if (expected != got) {
        throw new Error(MakeArityMessage(name, expected, got));
    }
}

export function GenerateGuardedFunction(name: string, guards: (PlStuffType | "*")[], func: Function) {
    return function(...args: PlStuff[]) {
        ExpectedNArguments(name, args.length, guards.length);
        for (let i = 0; i < guards.length; ++i) {
            const guard = guards[i];
            if (guard == "*") {
                continue;
            }
            AssertType(name, args[i], guard, i+1);
        }
        return func.bind(this)(...args);
    }
}


export function GenerateGuardedTypeFunction(name: string, guards: (PlStuffType | "*")[], func: Function) {
    return function(...args: PlStuff[]) {
        // first one is self
        const first = args.shift();

        ExpectedNArguments(name, args.length, guards.length);
        for (let i = 0; i < guards.length; ++i) {
            const guard = guards[i];
            if (guard == "*") {
                continue;
            }
            AssertType(name, args[i], guard, i+1);
        }
        return func.bind(this)(first, ...args);
    }
}


export function GenerateJsGuardedFunction(name: string, guards: (TypeofTypes | "*")[], func: Function) {
    return function(...args: PlStuff[]) {
        ExpectedNArguments(name, args.length, guards.length);
        for (let i = 0; i < guards.length; ++i) {
            const guard = guards[i];
            if (guard == "*") {
                continue;
            }
            AssertTypeof(name, args[i], guard, i+1);
        }
        return func.bind(this)(...args);
    }
}


export function GenerateJsGuardedTypeFunction(name: string, guards: (TypeofTypes | "*")[], func: Function) {
    return function(...args: PlStuff[]) {
        const first = args.shift();
        ExpectedNArguments(name, args.length, guards.length);
        for (let i = 0; i < guards.length; ++i) {
            const guard = guards[i];
            if (guard == "*") {
                continue;
            }
            AssertTypeof(name, args[i], guard, i+1);
        }
        return func.bind(this)(first, ...args);
    }
}

function wrapBool(value: Function) {
    return (...args) => {
        return value(...args) == true ? PlStuffTrue : PlStuffFalse;
    }
}

export function GenerateCompare(type: PlStuffType, eq: Function | null = null, gt: Function | null = null) {
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


export function GenerateForAll(name: string, func: Function) {
    const out = {};
    for (const item in PlStuffType) {
        if (!isNaN(Number(item))) {
            out[ScrambleFunction(name, +item)] = func;
        }
    }
    return out;
}

export function GenerateForSome(name: string, types: PlStuffType[], func: Function) {
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

