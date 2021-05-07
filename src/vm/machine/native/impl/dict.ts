import {ScrambleFunction} from "../../scrambler";
import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../../stuff";
import {expectedNArguments} from "../helpers";
import {PlActions} from "../converter";
import PlToString = PlActions.PlToString;

export const dict = {
    [ScrambleFunction( "get", PlStuffType.Dict )]: function(self: PlStuff, key: PlStuff) {
        expectedNArguments(1, arguments);
        const skey  = PlToString(key);
        if (skey in self.value) {
            return self.value[skey];
        }
        throw new Error("dict does not contain such key");
    },
    [ScrambleFunction( "set", PlStuffType.Dict )]: function(self: PlStuff, key: PlStuff, value: PlStuff) {
        expectedNArguments(2, arguments);
        const skey = PlToString(key);
        self.value[skey] = value;
        return self;
    },
    [ScrambleFunction("delete", PlStuffType.Dict)]: function(self: PlStuff, key: PlStuff) {
        expectedNArguments(1, arguments);
        const skey = PlToString(key);
        if (skey in self.value) {
            delete self.value[skey];
            return self;
        }
        throw new Error("dict does not contain such key");
    },
    [ScrambleFunction("size", PlStuffType.Dict)]: function(self: PlStuff) {
        expectedNArguments(0, arguments);
        return NewPlStuff(PlStuffType.Num, Object.keys(self.value).length);
    },
    [ScrambleFunction("have", PlStuffType.Dict)]: function(self: PlStuff, value: PlStuff) {
        expectedNArguments(1, arguments);
        for (const key of Object.keys(self.value)) {
            if (key == PlToString(value)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    }
}

export const jsDict = {
    [ScrambleFunction("iter", PlStuffType.Dict)]: function(self) {
        expectedNArguments(0, arguments);
        const keys = Object.keys(self);
        let index = 0;
        return {
            next: () => {
                if (index >= keys.length) {
                    return [null, false];
                }
                const key = keys[index++];
                return [[self[key], key], true];
            }
        };
    },
    [ScrambleFunction("keys", PlStuffType.Dict)]: function(self) {
        expectedNArguments(0, arguments);
        return Object.keys(self);
    },
    [ScrambleFunction("values", PlStuffType.Dict)]: function(self) {
        expectedNArguments(0, arguments);
        return Object.values(self);
    }
}
