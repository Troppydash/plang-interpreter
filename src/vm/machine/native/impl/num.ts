import {ScrambleType} from "../../scrambler";
import {GenerateJsGuardedTypeFunction} from "../helpers";
import {PlStuffType} from "../../stuff";

export const jsNum = {
    [ScrambleType("abs", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("abs", [], function ( self) {
        if (self < 0)
            return -self;
        return self;
    }),
    [ScrambleType("floor", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("floor", [], function ( self) {
        return Math.floor(self);
    }),
    [ScrambleType("ceil", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("ceil", [], function ( self) {
        return Math.ceil(self);
    }),
    [ScrambleType("int", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("int", ["number"], function ( self: number, threshold) {
        if ((self - Math.floor(self)) > threshold) {
            return Math.ceil(self);
        }
        return Math.floor(self);
    }),
    [ScrambleType("round", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("round", ["number"], function ( self, precision ) {
        return Number.parseFloat(self).toPrecision(precision);
    }),
    [ScrambleType("pow", PlStuffType.Num)]: GenerateJsGuardedTypeFunction("pow", ["number"], function ( base, power) {
        return Math.pow(base, power);
    }),
};
