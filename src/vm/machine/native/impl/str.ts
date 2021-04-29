import {ScrambleFunction} from "../../scrambler";
import {PlStuffType} from "../../stuff";
import {expectedNArguments} from "../helpers";

export const jsStr = {
    [ScrambleFunction("size", PlStuffType.Str)]: function(self) {
        expectedNArguments(0, arguments);
        return self.length;
    }
};