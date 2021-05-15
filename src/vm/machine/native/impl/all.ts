import { GenerateForAll, GenerateForSome, GenerateGuardedTypeFunction } from "../helpers";
import { PlActions, PlConverter } from "../converter";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffGetType, PlStuffTrue, PlStuffType } from "../../stuff";
import { StackMachine } from "../../index";
import { ScrambleType } from "../../scrambler";
import { MakeNoTypeFunctionMessage } from "../messeger";


export const all = {
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
    /// TYPES
    ...GenerateForAll("bool", GenerateGuardedTypeFunction("bool", [], function(self) {
        return PlConverter.PlToPl(self, "Bool")
    })),
    ...GenerateForAll("str", GenerateGuardedTypeFunction("str", [], function(self) {
        return PlConverter.PlToPl(self, "Str")
    })),
    ...GenerateForSome("num", [PlStuffType.Bool, PlStuffType.Str, PlStuffType.Null, PlStuffType.Num], GenerateGuardedTypeFunction("num", [], function(self) {
        return PlConverter.PlToPl(self, "Num");
    })),
    ...GenerateForAll("type", GenerateGuardedTypeFunction("type", [], (object: PlStuff) => {
        if (object.type == PlStuffType.NFunc) {
            return NewPlStuff(PlStuffType.Type, PlStuffType.Func);
        }
        return NewPlStuff(PlStuffType.Type, object.type);
    })),
    ...GenerateForAll("in", GenerateGuardedTypeFunction("in", ["*"], function (this: StackMachine, self: PlStuff, other: PlStuff) {
        const value = this.findValue(ScrambleType("have", other.type));
        if (value.type == PlStuffType.NFunc) {
            return value.value.native(other, self);
        } else if (value.type == PlStuffType.Func) {
            return this.runFunction(value, [other, self])
        }
        throw new Error(MakeNoTypeFunctionMessage("in", "have", other));
    })),
    ...GenerateForAll("from", GenerateGuardedTypeFunction("from", ["*"], function (this: StackMachine, self: PlStuff, other: PlStuff) {
        const value = this.findValue(ScrambleType("get", other.type));
        if (value.type == PlStuffType.NFunc) {
            return value.value.native(other, self);
        } else if (value.type == PlStuffType.Func) {
            return this.runFunction(value, [other, self])
        }
        throw new Error(MakeNoTypeFunctionMessage("from", "get", other));
    })),

};
