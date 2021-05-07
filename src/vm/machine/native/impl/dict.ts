import {ScrambleFunction} from "../../scrambler";
import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../../stuff";
import {GenerateGuardedTypeFunction, GenerateJsGuardedTypeFunction} from "../helpers";
import {PlActions} from "../converter";
import {MakeNotFoundMessage} from "../messeger";
import PlToString = PlActions.PlToString;

export const dict = {
    [ScrambleFunction("get", PlStuffType.Dict)]: GenerateGuardedTypeFunction("get", ["*"], function (self: PlStuff, key: PlStuff) {
        const skey = PlToString(key);
        if (skey in self.value) {
            return self.value[skey];
        }
        throw new Error(MakeNotFoundMessage("get", PlStuffType.Dict, skey));
    }),
    [ScrambleFunction("set", PlStuffType.Dict)]: GenerateGuardedTypeFunction("set", ["*", "*"], function (self: PlStuff, key: PlStuff, value: PlStuff) {
        const skey = PlToString(key);
        self.value[skey] = value;
        return self;
    }),
    [ScrambleFunction("delete", PlStuffType.Dict)]: GenerateGuardedTypeFunction("delete", ["*"], function (self: PlStuff, key: PlStuff) {
        const skey = PlToString(key);
        if (skey in self.value) {
            delete self.value[skey];
            return self;
        }
        throw new Error(MakeNotFoundMessage("delete", PlStuffType.Dict, skey));
    }),
    [ScrambleFunction("size", PlStuffType.Dict)]: GenerateGuardedTypeFunction("size", [], function (self: PlStuff) {
        return NewPlStuff(PlStuffType.Num, Object.keys(self.value).length);
    }),
    [ScrambleFunction("have", PlStuffType.Dict)]: GenerateGuardedTypeFunction("have", ["*"], function (self: PlStuff, value: PlStuff) {
        for (const key of Object.keys(self.value)) {
            if (key == PlToString(value)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    })
}

export const jsDict = {
    [ScrambleFunction("iter", PlStuffType.Dict)]: GenerateJsGuardedTypeFunction("iter", [], function (self) {
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
    }),
    [ScrambleFunction("keys", PlStuffType.Dict)]: GenerateJsGuardedTypeFunction("keys", [], function (self) {
        return Object.keys(self);
    }),
    [ScrambleFunction("values", PlStuffType.Dict)]: GenerateJsGuardedTypeFunction("values", [], function (self) {
        return Object.values(self);
    })
}
