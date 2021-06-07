import {ScrambleType} from "../../scrambler";
import {PlStuffType} from "../../stuff";
import {GenerateGuardedTypeFunction} from "../helpers";

export const jsNum = {
    [ScrambleType("abs", PlStuffType.Num)]: GenerateGuardedTypeFunction("abs", [], function ( self) {
        if (self < 0)
            return -self;
        return self;
    }),
    [ScrambleType("floor", PlStuffType.Num)]: GenerateGuardedTypeFunction("floor", [], function ( self) {
        return Math.floor(self);
    }),
    [ScrambleType("ceil", PlStuffType.Num)]: GenerateGuardedTypeFunction("ceil", [], function ( self) {
        return Math.ceil(self);
    }),
    [ScrambleType("int", PlStuffType.Num)]: GenerateGuardedTypeFunction("int", [PlStuffType.Num], function ( self: number, threshold) {
        if ((self - Math.floor(self)) > threshold) {
            return Math.ceil(self);
        }
        return Math.floor(self);
    }),
    [ScrambleType("round", PlStuffType.Num)]: GenerateGuardedTypeFunction("round", [PlStuffType.Num], function ( self, precision ) {
        return Number.parseFloat(self).toPrecision(precision);
    }),
    [ScrambleType("pow", PlStuffType.Num)]: GenerateGuardedTypeFunction("pow", [PlStuffType.Num], function ( base, power) {
        return Math.pow(base, power);
    }),
};
