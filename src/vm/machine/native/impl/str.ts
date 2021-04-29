import {ScrambleFunction} from "../../scrambler";
import {PlStuffType} from "../../stuff";
import {assertTypeof, expectedNArguments} from "../helpers";

export const jsStr = {
    [ScrambleFunction("size", PlStuffType.Str)]: function(self) {
        expectedNArguments(0, arguments);
        return self.length;
    },
    [ScrambleFunction("have", PlStuffType.Str)]: (l, r) => {
        assertTypeof(r, "string", "'have' needs a string as an argument");
        return l.indexOf(r) != -1;
    },
};