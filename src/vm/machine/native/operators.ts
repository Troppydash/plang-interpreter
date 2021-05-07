import {ScrambleFunction} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../stuff";
import {
    AssertOperatorsSide,
    AssertTypeof,
    AssertTypeEqual,
    GenerateCompare,
    GenerateJsGuardedTypeFunction
} from "./helpers";
import {JsFunction, NativeFunction} from "./types";

export function equals(l: PlStuff, r: PlStuff) {
    if (l.type != r.type) {
        return PlStuffFalse;
    }

    // assume that l and r are the same type
    let out = false;
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
    [ScrambleFunction("+", PlStuffType.Num)]: AssertOperatorsSide("+", (l, r) => l + r),
    [ScrambleFunction("-", PlStuffType.Num)]: AssertOperatorsSide("-",(l, r) => l - r),
    [ScrambleFunction("*", PlStuffType.Num)]: AssertOperatorsSide("*",(l, r) => l * r),
    [ScrambleFunction("/", PlStuffType.Num)]: AssertOperatorsSide("/",(l, r) => l / r),
    [ScrambleFunction("mod", PlStuffType.Num)]: AssertOperatorsSide("mod",(l, r) => l % r),

    // strings
    [ScrambleFunction("+", PlStuffType.Str)]: AssertOperatorsSide("+", (l, r) => l + r),
    [ScrambleFunction("*", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("*", ["number"], (l, r) => {
        return l.repeat(r);
    })
};

export const operators: Record<string, NativeFunction> = {
    ...GenerateCompare(PlStuffType.Num, equals, AssertTypeEqual(">", greater)),
    ...GenerateCompare(PlStuffType.Str, equals, AssertTypeEqual(">", greater)),
    ...GenerateCompare(PlStuffType.Bool, equals),
    ...GenerateCompare(PlStuffType.Null, equals),
    ...GenerateCompare(PlStuffType.Type, equals),
    ...GenerateCompare(PlStuffType.Func, equals),
    ...GenerateCompare(PlStuffType.List, equals),
    ...GenerateCompare(PlStuffType.Dict, equals),
};
