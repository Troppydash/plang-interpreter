import {ScrambleFunction} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../stuff";
import {assertTypeofEqual, assertTypeof, assertTypeEqual, generateCompare} from "./helpers";
import {JsFunction, NativeFunction} from "./types";

export function equals(l: PlStuff, r: PlStuff) {
    if (l.type != r.type) {
        return PlStuffFalse;
    }

    let out;
    switch (l.type) {
        case PlStuffType.Num:
        case PlStuffType.Bool:
        case PlStuffType.Type:
        case PlStuffType.Str:
            out = l.value === r.value;
            break;

        case PlStuffType.Null:
            out = true;

        case PlStuffType.List:
        case PlStuffType.Dict:
        case PlStuffType.NFunc:
        case PlStuffType.Func:
            out = false; // TODO: WRITE THESE
            break;
    }
    return out
}

function greater(l: PlStuff, r: PlStuff) {
    return l.value > r.value;
}

export const jsOperators: Record<string, JsFunction> = {
    // numbers
    [ScrambleFunction("+", PlStuffType.Num)]: assertTypeofEqual((l, r) => l + r),
    [ScrambleFunction("-", PlStuffType.Num)]: assertTypeofEqual((l, r) => l - r),
    [ScrambleFunction("*", PlStuffType.Num)]: assertTypeofEqual((l, r) => l * r),
    [ScrambleFunction("/", PlStuffType.Num)]: assertTypeofEqual((l, r) => l / r),
    [ScrambleFunction("mod", PlStuffType.Num)]: assertTypeofEqual((l, r) => l % r),

    // strings
    [ScrambleFunction("+", PlStuffType.Str)]: assertTypeofEqual((l, r) => l + r),
    [ScrambleFunction("*", PlStuffType.Str)]: (l, r) => {
        assertTypeof(r, "number", "string can only multiply with numbers");
        return l.repeat(r);
    }
};

export const operators: Record<string, NativeFunction> = {
    ...generateCompare(PlStuffType.Num, equals, assertTypeEqual(greater)),
    ...generateCompare(PlStuffType.Str, equals),
    ...generateCompare(PlStuffType.Bool, equals),
    ...generateCompare(PlStuffType.Null, equals),
    ...generateCompare(PlStuffType.Type, equals),
    ...generateCompare(PlStuffType.Func, equals),
    ...generateCompare(PlStuffType.List, equals),
    ...generateCompare(PlStuffType.Dict, equals),
};
