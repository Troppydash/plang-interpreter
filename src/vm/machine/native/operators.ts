import {ScrambleType} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../stuff";
import {
    AssertOperatorsSide,
    AssertTypeEqual,
    GenerateCompare,
    GenerateJsGuardedTypeFunction
} from "./helpers";
import { ExportJs, ExportNative } from "./types";

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
            out = false; // TODO: WRITE THESE
            break;
    }
    return out
}

function greater(l: PlStuff, r: PlStuff) {
    return l.value > r.value;
}

export const jsOperators: ExportJs = {
    // numbers
    [ScrambleType("+", PlStuffType.Num)]: AssertOperatorsSide("+", (l, r) => l + r),
    [ScrambleType("-", PlStuffType.Num)]: AssertOperatorsSide("-",(l, r) => l - r),
    [ScrambleType("*", PlStuffType.Num)]: AssertOperatorsSide("*",(l, r) => l * r),
    [ScrambleType("/", PlStuffType.Num)]: AssertOperatorsSide("/",(l, r) => l / r),
    [ScrambleType("mod", PlStuffType.Num)]: AssertOperatorsSide("mod",(l, r) => l % r),

    // strings
    [ScrambleType("+", PlStuffType.Str)]: AssertOperatorsSide("+", (l, r) => l + r),
    [ScrambleType("*", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("*", ["number"], (l, r) => {
        return l.repeat(r);
    })
};

export const operators: ExportNative = {
    ...GenerateCompare(PlStuffType.Num, equals, AssertTypeEqual(">", greater)),
    ...GenerateCompare(PlStuffType.Str, equals, AssertTypeEqual(">", greater)),
    ...GenerateCompare(PlStuffType.Bool, equals),
    ...GenerateCompare(PlStuffType.Null, equals),
    ...GenerateCompare(PlStuffType.Type, equals),
    ...GenerateCompare(PlStuffType.Func, equals),
    ...GenerateCompare(PlStuffType.List, equals),
    ...GenerateCompare(PlStuffType.Dict, equals),
};
