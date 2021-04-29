import {ScrambleFunction} from "../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../stuff";
import {assertTypeofEqual, assertTypeof, assertTypeEqual, generateCompare} from "./helpers";

function equals(l: PlStuff, r: PlStuff) {
    if (l.type != r.type) {
        return PlStuffFalse;
    }

    let out;
    switch (l.type) {
        case PlStuffType.Int:
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

export const jsOperators = {
    // numbers
    [ScrambleFunction("+", PlStuffType.Int)]: assertTypeofEqual((l, r) => l + r),
    [ScrambleFunction("-", PlStuffType.Int)]: assertTypeofEqual((l, r) => l - r),
    [ScrambleFunction("*", PlStuffType.Int)]: assertTypeofEqual((l, r) => l * r),
    [ScrambleFunction("/", PlStuffType.Int)]: assertTypeofEqual((l, r) => l / r),
    [ScrambleFunction("mod", PlStuffType.Int)]: assertTypeofEqual((l, r) => l % r),

    // strings
    [ScrambleFunction("+", PlStuffType.Str)]: assertTypeofEqual((l, r) => l + r),
    [ScrambleFunction("*", PlStuffType.Str)]: (l, r) => {
        assertTypeof(r, "number", "string can only multiply with numbers");
        return l.repeat(r);
    },
    [ScrambleFunction("have", PlStuffType.Str)]: (l, r) => {
        assertTypeof(r, "string", "'have' needs a string as argument");
        return l.indexOf(r) != -1;
    },
};

export const operators = {
    ...generateCompare(PlStuffType.Int, equals, assertTypeEqual(greater)),
    ...generateCompare(PlStuffType.Str, equals),
    ...generateCompare(PlStuffType.Bool, equals),
    ...generateCompare(PlStuffType.Null, equals),
    ...generateCompare(PlStuffType.Type, equals),
    ...generateCompare(PlStuffType.Func, equals),
    ...generateCompare(PlStuffType.List, equals),
    ...generateCompare(PlStuffType.Dict, equals),
};
