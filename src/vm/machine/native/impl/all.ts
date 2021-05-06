import { assertType, expectedNArguments, generateForAll, generateForSome } from "../helpers";
import { PlActions } from "../converter";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType, PlStuffTypeFromString } from "../../stuff";
import {StackMachine} from "../../index";
import {ScrambleFunction} from "../../scrambler";
import PlCopy = PlActions.PlCopy;

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
        let otype = object.type;
        if (object.type == PlStuffType.NFunc) {
            otype = PlStuffType.Func;
        }
        return otype == type.value ? PlStuffTrue : PlStuffFalse;
    }),
    ...generateForAll("to", function (object: PlStuff, type: PlStuff) {
        expectedNArguments(1, arguments);
        assertType(type, PlStuffType.Type, ".to requires a type as an argument");
        if (object.type == type.type) {
            return PlActions.PlClone(object);
        }

        let out = null;
        switch (type.value) {
            case PlStuffType.Null:
                break;
            case PlStuffType.Bool:
                switch (object.type) {
                    case PlStuffType.Num:
                        out = object.value != 0;
                        break;
                    case PlStuffType.List:
                    case PlStuffType.Str:
                        out = object.value.length != 0;
                        break;
                    case PlStuffType.Dict:
                        out = Object.keys(object.value).length != 0;
                        break;
                    case PlStuffType.Func:
                    case PlStuffType.Type:
                        out = true;
                        break;
                    case PlStuffType.Null:
                        out = false;
                        break;
                }
                break;
            case PlStuffType.Str:
                out = PlActions.PlToString(object);
                break;

            case PlStuffType.Num: {
                let num = null;
                switch (object.type) {
                    case PlStuffType.Bool:
                        num = object.value == true ? 1 : 0;
                        break;
                    case PlStuffType.Str: {
                        const out = parseFloat(object.value);
                        if (!isNaN(out)) {
                            num = out;
                        }
                        break;
                    }
                    case PlStuffType.Null:
                        num = 0;
                        break;
                    case PlStuffType.Dict:
                    case PlStuffType.List:
                    case PlStuffType.Func:
                    case PlStuffType.Type:
                        break;
                }
                out = num;
                break;
            }
            case PlStuffType.Type:
                if (object.type == PlStuffType.Str) {
                    try {
                        const type = PlStuffTypeFromString(object.value);
                        out = type;
                    } catch (e) {
                        // nothing
                    }
                }
                break;
        }

        return NewPlStuff(out == null ? PlStuffType.Null : type.value, out);
    }),
    ...generateForAll("type", function(object: PlStuff) {
        expectedNArguments(0, arguments);
        if (object.type == PlStuffType.NFunc) {
            return NewPlStuff(PlStuffType.Type, PlStuffType.Func);
        }
        return NewPlStuff(PlStuffType.Type, object.type);
    }),
    ...generateForAll("in", function (this: StackMachine, self: PlStuff, other: PlStuff) {
        expectedNArguments(1, arguments);
        const value = this.findValue(ScrambleFunction("have", other.type));
        if (value == null) {
            throw new Error("no type function 'have' found on the other value");
        }
        // value is a native function for sure // TODO: make this work for all functions
        return value.value.callback(PlCopy(other), self);
    }),
    ...generateForAll("from", function (this: StackMachine, self: PlStuff, other: PlStuff) {
        expectedNArguments(1, arguments);
        const value = this.findValue(ScrambleFunction("get", other.type));
        if (value == null) {
            throw new Error("no type function 'get' found on the other value");
        }
        // value is a native function for sure // TODO: make this work for all functions
        return value.value.callback(PlCopy(other), self);
    }),
};
