import {assertType, expectedNArguments, generateForAll, generateForSome} from "../helpers";
import {PlActions} from "../converter";
import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType, PlStuffTypeToString} from "../../stuff";

export const all = {
    ...generateForAll("copy", function (object) {
        expectedNArguments(0, arguments);
        return PlActions.PlCopy(object);
    }),
    ...generateForAll("clone", function (object) {
        expectedNArguments(0, arguments);
        return PlActions.PlClone(object);
    }),
    ...generateForSome("isNative", [PlStuffType.NFunc, PlStuffType.Func], function (object) {
        expectedNArguments(0, arguments);
        return object.type == PlStuffType.NFunc ? PlStuffTrue : PlStuffFalse;
    }),
    ...generateForAll("is", function (object, type) {
        expectedNArguments(1, arguments);
        assertType(type, PlStuffType.Type, "'.is' requires a type as an argument");
        return PlStuffTypeToString(object.type) == type.value ? PlStuffTrue : PlStuffFalse;
    }),
    ...generateForAll("to", function (object: PlStuff, type: PlStuff) {
        expectedNArguments(1, arguments);
        if (object.type == type.type) {
            return PlActions.PlClone(object);
        }

        let out = null;
        switch (type.value) {
            case PlStuffType.Null:
                break;
            case PlStuffType.Bool:
                // is truthy
                break;
            case PlStuffType.Str:
                out = PlActions.PlToString(object);
                break;
        }

        return NewPlStuff(out == null ? PlStuffType.Null : type.value, out);
    })
};