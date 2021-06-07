import {ScrambleName, ScrambleType} from "../scrambler";
import {
    PlNativeFunction, PlParameterTypes,
    PlStuff,
    PlStuffFalse,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeAny,
    PlStuffTypeFromJsString,
    PlStuffTypes,
    PlStuffTypeToString,
} from "../stuff";
import {MakeArityMessage, MakeOperatorMessage, MakeTypeMessage} from "./messeger";
import {TypeofTypes} from "../../../extension";
import {PlConverter} from "./converter";
import JsToPl = PlConverter.JsToPl;

export function AssertTypeof(name: string, got: any, expected: TypeofTypes, position: number = 1) {
    if (typeof got != expected) {
        throw new Error(MakeTypeMessage(name, PlStuffTypeFromJsString(expected), JsToPl(got, null), position));
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
            throw new Error(MakeOperatorMessage(name, JsToPl(l, null).type, JsToPl(r, null).type));
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

export function GenerateGuardedFunction(name: string, guards: PlParameterTypes[], func: Function): PlNativeFunction {
    return {
        name,
        parameters: guards,
        native: func,
        self: null,
    };
}

export function GenerateGuardedTypeFunction(name: string, guards: PlParameterTypes[], func: Function): PlNativeFunction {
    return {
        name,
        parameters: [PlStuffTypeAny, ...guards],
        self: null,
        native: func
    };
}

//
// export function GenerateJsGuardedFunction(name: string, guards: (PlStuffType | "*")[], func: Function): PlNativeFunction {
//     return {
//         name,
//         parameters: guards,
//         self: null,
//         native: func.bind(this)
//     };
// }
//
//
// export function GenerateJsGuardedTypeFunction(name: string, guards: (TypeofTypes | "*")[], func: Function) {
//     return {
//         name,
//         parameters: guards,
//         self: null,
//         native: func.bind(this)
//     };
// }

export function GenerateForAll(name: string, func: PlNativeFunction) {
    const out = {};
    for (const item of PlStuffTypes) {
        out[ScrambleName(name, item)] = func;
    }
    return out;
}

export function GenerateForSome(name: string, types: PlStuffType[], func: PlNativeFunction) {
    const strs = types.map(t => PlStuffTypeToString(t));
    const out = {};
    for (const item of PlStuffTypes) {
        if (strs.includes(item)) {
            out[ScrambleName(name, item)] = func;
        }
    }
    return out;
}

