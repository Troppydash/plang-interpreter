import {
        GenerateExceptInst,
    GenerateForAll,
    GenerateForSome,
    GenerateGuardedTypeFunction
} from "../helpers";
import {PlActions, PlConverter} from "../converter";
import {
    NewPlStuff,
    PlStuff,
    PlStuffFalse,
    PlStuffGetType,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeAny,
    PlType
} from "../../stuff";
import {StackMachine} from "../../index";
import {ScrambleType} from "../../scrambler";
import {MakeNoTypeFunctionMessage} from "../messeger";
import {ExportNative} from "../types";


export const all: ExportNative = {
    ...GenerateForAll("copy", GenerateGuardedTypeFunction("copy", [], object => {
        return PlActions.PlCopy(object);
    })),
    ...GenerateForAll("clone", GenerateGuardedTypeFunction("clone", [], object => {
        return PlActions.PlClone(object);
    })),
    ...GenerateForSome("isNative", [PlStuffType.Func], GenerateGuardedTypeFunction("isNative", [], object => {
        return object.type == PlStuffType.NFunc ? PlStuffTrue : PlStuffFalse;

    })),
    ...GenerateForAll("is", GenerateGuardedTypeFunction("is", [PlStuffType.Type], (object, type) => {
        let otypestr = PlStuffGetType(object);
        return otypestr == type.value.type ? PlStuffTrue : PlStuffFalse;
    })),
    ...GenerateForAll("to", GenerateGuardedTypeFunction("to", [PlStuffType.Type], function(self, type) {
        return PlConverter.PlToPl(self, type.value, this);
    })),
    /// TYPES
    ...GenerateExceptInst("bool", GenerateGuardedTypeFunction("bool", [], function(self) {
        return PlConverter.PlToPl(self, {format: null, type: "Bool"}, this)
    })),
    ...GenerateExceptInst("str", GenerateGuardedTypeFunction("str", [], function(self) {
        return PlConverter.PlToPl(self, {format: null, type: "Str"}, this)
    })),
    ...GenerateForSome("num", [PlStuffType.Bool, PlStuffType.Str, PlStuffType.Null, PlStuffType.Num], GenerateGuardedTypeFunction("num", [], function(self) {
        return PlConverter.PlToPl(self, {format: null, type: "Num"}, this);
    })),
    ...GenerateForAll("type", GenerateGuardedTypeFunction("type", [], (object: PlStuff) => {
        if (object.type == PlStuffType.NFunc) {
            return NewPlStuff(PlStuffType.Type, {
                type: "Func",
                format: null,
            } as PlType);
        } else if (object.type == PlStuffType.Inst) {
            const format = Object.keys(object.value);
            return NewPlStuff(PlStuffType.Type, {
                type: PlStuffGetType(object),
                format,
            } as PlType);
        }

        return NewPlStuff(PlStuffType.Type, {
            type: PlStuffGetType(object),
            format: null
        } as PlType);
    })),
    ...GenerateForAll("in", GenerateGuardedTypeFunction("in", [PlStuffTypeAny], function (this: StackMachine, self: PlStuff, other: PlStuff) {
        const value = this.findValue(ScrambleType("have", other.type));
        if (value.type == PlStuffType.NFunc) {
            return value.value.native(other, self);
        } else if (value.type == PlStuffType.Func) {
            return this.runFunction(value, [other, self])
        }
        throw new Error(MakeNoTypeFunctionMessage("in", "have", other));
    })),
    ...GenerateForAll("from", GenerateGuardedTypeFunction("from", [PlStuffTypeAny], function (this: StackMachine, self: PlStuff, other: PlStuff) {
        const value = this.findValue(ScrambleType("get", other.type));
        if (value.type == PlStuffType.NFunc) {
            return value.value.native(other, self);
        } else if (value.type == PlStuffType.Func) {
            return this.runFunction(value, [other, self])
        }
        throw new Error(MakeNoTypeFunctionMessage("from", "get", other));
    })),

};
