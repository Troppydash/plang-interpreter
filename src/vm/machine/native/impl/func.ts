import {ExportNative} from "../types";
import {ScrambleType} from "../../scrambler";
import {NewPlStuff, PlFunction, PlStuff, PlStuffFunction, PlStuffType, PlStuffTypeAny} from "../../stuff";
import {GenerateGuardedTypeFunction} from "../helpers";
import {StackMachine} from "../../index";
import {PlActions} from "../converter";

export const func: ExportNative = {
    [ScrambleType("call", PlStuffType.Func)]: GenerateGuardedTypeFunction("call", [PlStuffType.List], function (this: StackMachine, self: PlStuffFunction, args: PlStuff) {
         try {
             return this.runFunction(self, args.value);
         } catch (e) {
             throw null;
         }
    }),
    [ScrambleType("bind", PlStuffType.Func)]: GenerateGuardedTypeFunction("bind", [PlStuffTypeAny], function(this: StackMachine, self, newSelf) {
        const newFunc = PlActions.PlCopy(self);
        newFunc.value.self = newSelf;
        (newFunc.value as any).name += '.bind'
        return newFunc;
    }),
    [ScrambleType("arity", PlStuffType.Func)]: GenerateGuardedTypeFunction("arity", [], function(self) {
        return NewPlStuff(PlStuffType.Num, (self.value).parameters.length);
    }),
    [ScrambleType("name", PlStuffType.Func)]: GenerateGuardedTypeFunction("name", [], (self: PlStuff) => {
        if (self.type == PlStuffType.Func) {
            return NewPlStuff(PlStuffType.Str, (self.value as PlFunction).closure.trace.name);
        }
        return NewPlStuff(PlStuffType.Str, self.value.name);
    })
}
