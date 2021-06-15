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
import {AssertType, GenerateGuardedTypeFunction} from "../helpers";
import {equals} from "../operators";
import {MakeNoTypeFunctionMessage, MakeOutOfRangeMessage} from "../messeger";
import {StackMachine} from "../../index";
import {PlConverter} from "../converter";
import PlToString = PlConverter.PlToString;

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

export const jsList = {
    [ScrambleType("size", PlStuffType.List)]: GenerateGuardedTypeFunction("size", [], function (lst) {
        return lst.length;
    })
};

export const list = {
    [ScrambleType("iter", PlStuffType.List)]: GenerateGuardedTypeFunction("iter", [], function (self: PlStuff) {
        let index = 0;
        return NewPlStuff(PlStuffType.Dict, {
            next: NewPlStuff(PlStuffType.NFunc, {
                parameters: [],
                self: null,
                name: "iter",
                native: () => {
                    if (index >= self.value.length) {
                        return NewPlStuff(PlStuffType.List, [PlStuffNull, PlStuffFalse]);
                    }
                    return NewPlStuff(PlStuffType.List, [
                        NewPlStuff(PlStuffType.List, [self.value[index++], NewPlStuff(PlStuffType.Num, index)]),
                        PlStuffTrue
                    ]);
                }
            } as PlNativeFunction)
        });
    }),
    [ScrambleType("get", PlStuffType.List)]: GenerateGuardedTypeFunction("get", [PlStuffTypeAny], function (self, index: PlStuff) {
        if (index.type != PlStuffType.List && index.type != PlStuffType.Num) {
            throw new Error("'get' requires a number or a list as argument");
        }
        const list = self.value;

        if (index.type == PlStuffType.List) {
            const indexes = index.value;
            let out = [];
            for (const index of indexes) {
                AssertType("get", index, PlStuffType.Num, 1);
                const idx = index.value - 1;
                if (idx < 0 || idx >= list.length) {
                    throw new Error(MakeOutOfRangeMessage("get", PlStuffType.List, list.length, idx));
                }
                out.push(list[idx]);
            }
            return NewPlStuff(PlStuffType.List, out);

        }
        const idx = index.value - 1;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("get", PlStuffType.List, list.length, index.value));
        }
        return list[idx];
    }),
    [ScrambleType("add", PlStuffType.List)]: GenerateGuardedTypeFunction("add", [PlStuffTypeAny], function (self: PlStuff, value: PlStuff) {
        self.value.push(value);
        return NewPlStuff(PlStuffType.Num, self.value.length);
    }),
    [ScrambleType("insert", PlStuffType.List)]: GenerateGuardedTypeFunction("insert", [PlStuffType.Num, PlStuffTypeAny], function (self: PlStuff, index: PlStuff, value: PlStuff) {
        const idx = index.value - 1;
        if (idx < 0 || idx >= self.value.length) {
            throw new Error(MakeOutOfRangeMessage("insert", PlStuffType.List, self.value.length, index.value));
        }
        self.value.splice(idx, 0, value);
        return self;
    }),
    [ScrambleType("pop", PlStuffType.List)]: GenerateGuardedTypeFunction("pop", [], function (self: PlStuff) {
        return self.value.pop();
    }),
    [ScrambleType("shift", PlStuffType.List)]: GenerateGuardedTypeFunction("shift", [], function (self: PlStuff) {
        return self.value.shift();
    }),
    [ScrambleType("set", PlStuffType.List)]: GenerateGuardedTypeFunction("set", [PlStuffType.Num, PlStuffTypeAny], function (self: PlStuff, index: PlStuff, value: PlStuff) {
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("set", PlStuffType.List, list.length, index.value));
        }
        list[idx] = value;
        return self;
    }),
    [ScrambleType("have", PlStuffType.List)]: GenerateGuardedTypeFunction("have", [PlStuffTypeAny], function (self, value) {
        for (const item of self.value) {
            if (equals(item, value)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    }),
    [ScrambleType("index", PlStuffType.List)]: GenerateGuardedTypeFunction("index", [PlStuffTypeAny], function (self, value) {
        for (let i = 0; i < self.value.length; i++) {
            if (equals(self.value[i], value)) {
                return NewPlStuff(PlStuffType.Num, i + 1);
            }
        }
        return NewPlStuff(PlStuffType.Num, 0);
    }),
    [ScrambleType("shuffle", PlStuffType.List)]: GenerateGuardedTypeFunction("shuffle", [], function (self: PlStuff) {
        self.value = shuffle(self.value);
        return self;
    }),
    [ScrambleType("remove", PlStuffType.List)]: GenerateGuardedTypeFunction("remove", [PlStuffType.Num], function (self: PlStuff, index: PlStuff) {
        const list: PlStuff[] = self.value;

        const idx = index.value - 1;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("remove", PlStuffType.List, list.length, index.value));
        }

        const [out] = list.splice(idx, 1);
        return out;
    }),
    [ScrambleType("join", PlStuffType.List)]: GenerateGuardedTypeFunction("join", [PlStuffType.Str], function (this: StackMachine, self: PlStuff, sep: PlStuff) {
        const strs = self.value.map(item => {
            return PlToString(item, this);
        });
        return NewPlStuff(PlStuffType.Str, strs.join(sep.value));
    }),
    [ScrambleType("random", PlStuffType.List)]: GenerateGuardedTypeFunction("random", [], function (self: PlStuff) {
        const lower = 0;
        const upper = self.value.length;
        return self.value[Math.floor(Math.random() * (upper - lower) + lower)];
    }),
    [ScrambleType("reverse", PlStuffType.List)]: GenerateGuardedTypeFunction("reverse", [], function (self: PlStuff) {
        const items: PlStuff[] = [...self.value];
        items.reverse();
        return NewPlStuff(PlStuffType.List, items);
    }),
    [ScrambleType("sort", PlStuffType.List)]: GenerateGuardedTypeFunction("sort", [], function (this: StackMachine, self: PlStuff) {
        self.value.sort((l, r) => {
            const gt = this.findFunction(">", l);
            if (gt == null) {
                throw new Error(MakeNoTypeFunctionMessage("sort", ">", l));
            }

            const eq = this.findFunction("==", l);
            if (eq == null) {
                throw new Error(MakeNoTypeFunctionMessage("sort", "==", l));
            }


            let result = this.runFunction(gt, [l, r]);
            if (result.value == true) {
                return 1;
            }

            result = this.runFunction(eq, [l, r]);
            if (result.value == true) {
                return 0;
            }
            return -1;
        })
        return self;
    }),
}
