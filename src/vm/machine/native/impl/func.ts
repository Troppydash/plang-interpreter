import {ExportNative} from "../types";
import {ScrambleType} from "../../scrambler";
import {NewPlStuff, PlFunction, PlNativeFunction, PlStuff, PlStuffFunction, PlStuffType} from "../../stuff";
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
    [ScrambleType("bind", PlStuffType.Func)]: GenerateGuardedTypeFunction("bind", ["*"], function(this: StackMachine, self, newSelf) {
        const newFunc = PlActions.PlClone(self);
        newFunc.value.self = newSelf;
        newFunc.value.name += '.bind()'
        return newFunc;
    })
}
