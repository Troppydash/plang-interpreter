import {ScrambleFunction} from "../../scrambler";
import {GenerateJsGuardedTypeFunction} from "../helpers";
import {PlStuffType} from "../../stuff";

export const jsNum = {
    [ScrambleFunction("abs", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("abs", [], function (self) {
        if (self < 0)
            return -self;
        return self;
    }),
    [ScrambleFunction("floor", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("abs", [], function (self) {
        return Math.floor(self);
    }),
    [ScrambleFunction("ceil", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("abs", [], function (self) {
        return Math.ceil(self);
    }),
    [ScrambleFunction("round", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("abs", ["number"], function (self: number, threshold) {
        if ((self - Math.floor(self)) > threshold) {
            return Math.ceil(self);
        }
        return Math.floor(self);
    }),
    [ScrambleFunction("pow", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("pow", ["number"], function (base, power) {
        return Math.pow(base, power);
    }),
};