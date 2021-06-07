import {ScrambleType} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType, PlStuffTypeAny} from "../stuff";
import {
    GenerateGuardedTypeFunction,
} from "./helpers";
import {ExportJs, ExportNative} from "./types";

export function equals(l: PlStuff, r: PlStuff) {
    if (l.type != r.type) {
        return false;
    }

    // assume that l and r are the same type
    let out = false;
    switch (l.type) {
        case PlStuffType.Num:
        case PlStuffType.Bool:
        case PlStuffType.Str:
            out = l.value === r.value;
            break;
        case PlStuffType.Type:
            out = l.value.type == r.value.type;
            break;

        case PlStuffType.Null:
            out = true;
            break;

        case PlStuffType.List:
        case PlStuffType.Dict:
        case PlStuffType.NFunc:
        case PlStuffType.Func:
            out = false;
            break;
    }
    return out
}

function greater(l: PlStuff, r: PlStuff) {
    return l.value > r.value;
}

function generateOperation(name: string, operand: PlStuffType, func: Function) {
    return GenerateGuardedTypeFunction(name, [operand], func);
}

function wrapBool(value: Function) {
    return (...args) => {
        return value(...args) == true ? PlStuffTrue : PlStuffFalse;
    }
}

function generateCompare(type: PlStuffType, eq: Function | null = null, gt: Function | null = null) {
    let equals;
    let nequals;
    let greater;
    let ngreater;
    if (eq) {
        equals = GenerateGuardedTypeFunction("==", [PlStuffTypeAny], wrapBool(eq));
        nequals = GenerateGuardedTypeFunction("!=", [PlStuffTypeAny], wrapBool((l, r) => !eq(l, r)));
    }
    if (gt) {
        greater = generateOperation(">", type, wrapBool(gt));
        ngreater = generateOperation("<=", type, wrapBool((l, r) => !gt(l, r)));
    }

    let out = {};
    if (equals) {
        out = {
            ...out,
            [ScrambleType("==", type)]: equals,
            [ScrambleType("/=", type)]: nequals,
        };
    }
    if (greater) {
        out = {
            ...out,
            [ScrambleType(">", type)]: greater,
            [ScrambleType("<=", type)]: ngreater,
        };
    }
    if (equals && greater) {
        out = {
            ...out,
            [ScrambleType("<", type)]: generateOperation("<", type, wrapBool((l, r) => !eq(l, r) && !gt(l, r))),
            [ScrambleType(">=", type)]: generateOperation("<", type, wrapBool((l, r) => eq(l, r) || gt(l, r))),
        };
    }
    return out;
}


export const jsOperators: ExportJs = {
    // // numbers
    [ScrambleType("+", PlStuffType.Num)]: generateOperation("+", PlStuffType.Num, (l, r) => l + r),
    [ScrambleType("-", PlStuffType.Num)]: generateOperation("-", PlStuffType.Num, (l, r) => l - r),
    [ScrambleType("*", PlStuffType.Num)]: generateOperation("*", PlStuffType.Num, (l, r) => l * r),
    [ScrambleType("/", PlStuffType.Num)]: generateOperation("/", PlStuffType.Num, (l, r) => l / r),
    [ScrambleType("mod", PlStuffType.Num)]: generateOperation("mod", PlStuffType.Num, (l, r) => l % r),

    // strings
    [ScrambleType("+", PlStuffType.Str)]: generateOperation("+", PlStuffType.Str, (l, r) => l + r),
    [ScrambleType("*", PlStuffType.Str)]: GenerateGuardedTypeFunction("*", [PlStuffType.Num], (l, r) => {
        return l.repeat(r);
    }),
};

export const operators: ExportNative = {
    ...generateCompare(PlStuffType.Num, equals, greater),
    ...generateCompare(PlStuffType.Str, equals, greater),
    ...generateCompare(PlStuffType.Bool, equals),
    ...generateCompare(PlStuffType.Null, equals),
    ...generateCompare(PlStuffType.Type, equals),
    ...generateCompare(PlStuffType.Func, equals),
    ...generateCompare(PlStuffType.List, equals),
    ...generateCompare(PlStuffType.Dict, equals),
};
