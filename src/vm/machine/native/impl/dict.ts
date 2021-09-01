import {ScrambleType} from "../../scrambler";
import {
    NewPlStuff,
    PlNativeFunction,
    PlStuff,
    PlStuffFalse,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeAny
} from "../../stuff";
import {GenerateGuardedTypeFunction} from "../helpers";
import {PlConverter} from "../converter";
import {MakeNotFoundMessage} from "../messeger";
import PlToString = PlConverter.PlToString;

export const dict = {
    [ScrambleType("get", PlStuffType.Dict)]: GenerateGuardedTypeFunction("get", [PlStuffTypeAny], function ( self: PlStuff, key: PlStuff) {
        const skey = PlToString(key, this);
        if (skey in self.value) {
            return self.value[skey];
        }
        throw new Error(MakeNotFoundMessage("get", PlStuffType.Dict, skey));
    }),
    [ScrambleType("set", PlStuffType.Dict)]: GenerateGuardedTypeFunction("set", [PlStuffTypeAny, PlStuffTypeAny], function ( self: PlStuff, key: PlStuff, value: PlStuff) {
        const skey = PlToString(key, this);
        self.value[skey] = value;
        return value;
    }),
    [ScrambleType("delete", PlStuffType.Dict)]: GenerateGuardedTypeFunction("delete", [PlStuffTypeAny], function ( self: PlStuff, key: PlStuff) {
        const skey = PlToString(key, this);
        if (skey in self.value) {
            delete self.value[skey];
            return self;
        }
        throw new Error(MakeNotFoundMessage("delete", PlStuffType.Dict, skey));
    }),
    [ScrambleType("size", PlStuffType.Dict)]: GenerateGuardedTypeFunction("size", [], function ( self: PlStuff) {
        return NewPlStuff(PlStuffType.Num, Object.keys(self.value).length);
    }),
    [ScrambleType("have", PlStuffType.Dict)]: GenerateGuardedTypeFunction("have", [PlStuffTypeAny], function ( self: PlStuff, value: PlStuff) {
        for (const key of Object.keys(self.value)) {
            if (key == PlToString(value, this)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    }),
    [ScrambleType("iter", PlStuffType.Dict)]: GenerateGuardedTypeFunction("iter", [], function (self: PlStuff) {
        const keys = Object.keys(self.value);
        let index = 0;
        return NewPlStuff(PlStuffType.Dict, {
            next: NewPlStuff(PlStuffType.NFunc, {
                parameters: [],
                self: null,
                name: "iter",
                native: () => {
                    if (index >= keys.length) {
                        return NewPlStuff(PlStuffType.List, [PlStuffNull, PlStuffFalse]);
                    }
                    const key = keys[index++];
                    return NewPlStuff(PlStuffType.List, [
                        NewPlStuff(PlStuffType.List, [self.value[key], NewPlStuff(PlStuffType.Str, key)]),
                        PlStuffTrue
                    ]);
                }
            } as PlNativeFunction)
        });
    }),
}

export const jsDict = {
    [ScrambleType("iter", PlStuffType.Dict)]: GenerateGuardedTypeFunction("iter", [], function ( self) {
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
    [ScrambleType("keys", PlStuffType.Dict)]: GenerateGuardedTypeFunction("keys", [], function ( self) {
        return Object.keys(self);
    }),
    [ScrambleType("values", PlStuffType.Dict)]: GenerateGuardedTypeFunction("values", [], function ( self) {
        return Object.values(self);
    })
}
