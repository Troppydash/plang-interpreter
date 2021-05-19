import { ScrambleType } from "../../scrambler";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffTrue, PlStuffType } from "../../stuff";
import { AssertType, GenerateGuardedTypeFunction, GenerateJsGuardedTypeFunction } from "../helpers";
import { equals } from "../operators";
import { MakeNoTypeFunctionMessage, MakeOutOfRangeMessage } from "../messeger";
import { StackMachine } from "../../index";
import { PlConverter } from "../converter";
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
    [ScrambleType("size", PlStuffType.List)]: GenerateJsGuardedTypeFunction("size", [], function (lst) {
        return lst.length;
    }),
    [ScrambleType("iter", PlStuffType.List)]: GenerateJsGuardedTypeFunction("iter", [], function (self) {
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
    [ScrambleType("get", PlStuffType.List)]: GenerateGuardedTypeFunction("get", ["*"], function (self, index: PlStuff) {
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
    [ScrambleType("add", PlStuffType.List)]: GenerateGuardedTypeFunction("add", ["*"], function (self: PlStuff, value: PlStuff) {
        self.value.push(value);
        return self;
    }),
    [ScrambleType("pop", PlStuffType.List)]: GenerateGuardedTypeFunction("pop", [], function (self: PlStuff) {
        return self.value.pop();
    }),
    [ScrambleType("set", PlStuffType.List)]: GenerateGuardedTypeFunction("set", [PlStuffType.Num, "*"], function (self: PlStuff, index: PlStuff, value: PlStuff) {
        const idx = index.value - 1;
        const list = self.value;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("set", PlStuffType.List, list.length, index.value));
        }
        list[idx] = value;
        return self;
    }),
    [ScrambleType("have", PlStuffType.List)]: GenerateGuardedTypeFunction("have", ["*"], function (self, value) {
        for (const item of self.value) {
            if (equals(item, value)) {
                return PlStuffTrue;
            }
        }
        return PlStuffFalse;
    }),
    [ScrambleType("index", PlStuffType.List)]: GenerateGuardedTypeFunction("index", ["*"], function (self, value) {
        for (let i = 0; i < self.value.length; i++) {
            if (equals(self.value[i], value)) {
                return NewPlStuff(PlStuffType.Num, i+1);
            }
        }
        return NewPlStuff(PlStuffType.Num, 0);
    }),
    [ScrambleType("shuffle", PlStuffType.List)]: GenerateGuardedTypeFunction("shuffle", [], function(self: PlStuff) {
        self.value = shuffle(self.value);
        return self;
    }),
    [ScrambleType("remove", PlStuffType.List)]: GenerateGuardedTypeFunction("remove", [PlStuffType.Num], function ( self: PlStuff, index: PlStuff ) {
        const list: PlStuff[] = self.value;

        const idx = index.value - 1;
        if (idx < 0 || idx >= list.length) {
            throw new Error(MakeOutOfRangeMessage("remove", PlStuffType.List, list.length, index.value));
        }

        list.splice(idx, 1);
        return list;
    }),
    [ScrambleType("join", PlStuffType.List)]: GenerateGuardedTypeFunction("join", [PlStuffType.Str], function ( this: StackMachine, self: PlStuff, sep: PlStuff ) {
        const strs = self.value.map(item => {
            return PlToString(item, this);
        });
        return NewPlStuff(PlStuffType.Str, strs.join(sep.value));
    }),
    [ScrambleType("sort", PlStuffType.List)]: GenerateGuardedTypeFunction("sort", [], function(this: StackMachine, self: PlStuff) {
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
    })
}
