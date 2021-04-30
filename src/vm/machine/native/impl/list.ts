import { ScrambleFunction } from "../../scrambler";
import { PlStuff, PlStuffType } from "../../stuff";
import { assertType, expectedNArguments } from "../helpers";

export const jsList = {
    [ScrambleFunction( "size", PlStuffType.List )]: function(lst) {
        expectedNArguments(0, arguments);
        return lst.length;
    },
    [ScrambleFunction("iter", PlStuffType.List)]: function(self) {
        expectedNArguments(0, arguments);
        let index = 0;
        return {
            next: () => {
                if (index >= self.length) {
                    return [null, false];
                }
                return [[self[index++], index], true];
            }
        }
    }
};

export const list = {
    [ScrambleFunction( "get", PlStuffType.List )]: function(self, index) {
        expectedNArguments(1, arguments);
        assertType(index, PlStuffType.Num, "'get' needs a number as an argument");
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error("list index out of range");
        }
        return list[idx];
    },
    [ScrambleFunction( "add", PlStuffType.List )]: function(self: PlStuff, value: PlStuff) {
        expectedNArguments(1, arguments);
        self.value.push(value);
        return self;
    },
    [ScrambleFunction( "pop", PlStuffType.List )]: function(self: PlStuff, value: PlStuff) {
        expectedNArguments(0, arguments);
        return self.value.pop();
    },
    [ScrambleFunction( "set", PlStuffType.List )]: function(self: PlStuff, index: PlStuff, value: PlStuff) {
        expectedNArguments(2, arguments);
        assertType(index, PlStuffType.Num, "'set' needs a number as the first argument");
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error("list index out of range");
        }
        list[idx] = value;
        return self;
    },
}
