import {ScrambleFunction} from "../../scrambler";
import {PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType} from "../../stuff";
import {GenerateGuardedTypeFunction, GenerateJsGuardedTypeFunction} from "../helpers";
import {equals} from "../operators";
import {MakeOutOfRangeMessage} from "../messeger";

export const jsList = {
    [ScrambleFunction("size", PlStuffType.List)]: GenerateJsGuardedTypeFunction("size", [], function (lst) {
        return lst.length;
    }),
    [ScrambleFunction("iter", PlStuffType.List)]: GenerateJsGuardedTypeFunction("iter", [], function (self) {
        let index = 0;
        return {
            next: () => {
                if (index >= self.length) {
                    return [null, false];
                }
                return [[self[index++], index], true];
            }
        }
    })
};

export const list = {
    [ScrambleFunction("get", PlStuffType.List)]: GenerateGuardedTypeFunction("get", [PlStuffType.Num], function (self, index) {
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("get", PlStuffType.List, list.length, index.value));
        }
        return list[idx];
    }),
    [ScrambleFunction("add", PlStuffType.List)]: GenerateGuardedTypeFunction("add", ["*"], function (self: PlStuff, value: PlStuff) {
        self.value.push(value);
        return self;
    }),
    [ScrambleFunction("pop", PlStuffType.List)]: GenerateGuardedTypeFunction("pop", [], function (self: PlStuff) {
        return self.value.pop();
    }),
    [ScrambleFunction("set", PlStuffType.List)]: GenerateGuardedTypeFunction("set", [PlStuffType.Num, "*"], function (self: PlStuff, index: PlStuff, value: PlStuff) {
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("set", PlStuffType.List, list.length, index.value));
        }
        list[idx] = value;
        return self;
    }),
    [ScrambleFunction("have", PlStuffType.List)]: GenerateGuardedTypeFunction("have", ["*"], function (self, value) {
        for (const item of self.value) {
            if (equals(item, value)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    })
}
