import {ScrambleFunction} from "../../scrambler";
import {assertTypeof, expectedNArguments} from "../helpers";
import {PlStuffType} from "../../stuff";

export const jsNum = {
    [ScrambleFunction("abs", PlStuffType.Num)]: function (self) {
        expectedNArguments(0, arguments);
        if (self < 0)
            return -self;
        return self;
    },
    [ScrambleFunction("floor", PlStuffType.Num)]: function (self) {
        expectedNArguments(0, arguments);
        return Math.floor(self);
    },
    [ScrambleFunction("ceil", PlStuffType.Num)]: function (self) {
        expectedNArguments(0, arguments);
        return Math.ceil(self);
    },
    [ScrambleFunction("round", PlStuffType.Num)]: function (self: number, threshold) {
        expectedNArguments(1, arguments);
        assertTypeof(threshold, "number", "'round' needs a threshold as a parameter");
        if ((self - Math.floor(self)) > threshold) {
            return Math.ceil(self);
        }
        return Math.floor(self);
    }
};