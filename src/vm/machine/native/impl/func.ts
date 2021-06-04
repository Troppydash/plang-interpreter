import {ExportNative} from "../types";
import {ScrambleType} from "../../scrambler";
import {PlStuff, PlStuffFunction, PlStuffType} from "../../stuff";
import {GenerateGuardedTypeFunction} from "../helpers";
import {StackMachine} from "../../index";

export const func: ExportNative = {
    [ScrambleType("call", PlStuffType.Func)]: GenerateGuardedTypeFunction("call", [PlStuffType.List], function (this: StackMachine, self: PlStuffFunction, args: PlStuff) {
         try {
             return this.runFunction(self, args.value);
         } catch (e) {
             throw null;
         }
    })
}
