import {ScrambleType} from "../../scrambler";
import {NewPlStuff, PlStuff, PlStuffType} from "../../stuff";
import {GenerateGuardedTypeFunction} from "../helpers";
import {ExportJs, ExportNative} from "../types";
import {MakeOutOfRangeMessage} from "../messeger";
import {StackMachine} from "../../index";

export const jsStr: ExportJs = {
    [ScrambleType("size", PlStuffType.Str)]: GenerateGuardedTypeFunction("size", [], function (self) {
        return self.length;
    }),
    [ScrambleType("have", PlStuffType.Str)]: GenerateGuardedTypeFunction("size", [PlStuffType.Str], function (l, r) {
        return l.indexOf(r) != -1;
    }),
    [ScrambleType("get", PlStuffType.Str)]: GenerateGuardedTypeFunction("get", [PlStuffType.Num], function (self: string, index: number) {
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error(MakeOutOfRangeMessage("get", PlStuffType.Str, self.length, index + 1));
        }
        return self[index];
    }),
    [ScrambleType("replace", PlStuffType.Str)]: GenerateGuardedTypeFunction("replace", [PlStuffType.Str, PlStuffType.Str], function (self, source, target) {
        return self.split(source).join(target);
        // index--;
        // if (index < 0 || index >= self.length) {
        //     throw new Error(MakeOutOfRangeMessage("replace", PlStuffType.Str, self.length, index + 1));
        // }
        // return self.substring(0, index) + value + self.substring(index + 1);
    }),
    [ScrambleType("insert", PlStuffType.Str)]: GenerateGuardedTypeFunction("insert", [PlStuffType.Num, PlStuffType.Str], function (self, index, value) {
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error(MakeOutOfRangeMessage("insert", PlStuffType.Str, self.length, index + 1));
        }
        return self.substring(0, index) + value + self.substring(index)
    }),
    [ScrambleType("find", PlStuffType.Str)]: GenerateGuardedTypeFunction("find", [PlStuffType.Str], function (self: string, value) {
        const result = self.indexOf(value);
        return result == -1 ? null : result + 1;
    }),
    [ScrambleType("iter", PlStuffType.Str)]: GenerateGuardedTypeFunction("iter", [], function (self: string) {
        let index = 0;
        return {
            next: () => {
                if (index >= self.length) {
                    return [null, false];
                }
                return [[self[index++], index], true];
            }
        }
    }),
    [ScrambleType("upper", PlStuffType.Str)]: GenerateGuardedTypeFunction("upper", [], function (self: string) {
        return self.toUpperCase();
    }),
    [ScrambleType("lower", PlStuffType.Str)]: GenerateGuardedTypeFunction("lower", [], function (self: string) {
        return self.toLowerCase();
    }),
};

export const str: ExportNative = {
    [ScrambleType("split", PlStuffType.Str)]: GenerateGuardedTypeFunction("split", [PlStuffType.Str], function (this: StackMachine, self: PlStuff, sep: PlStuff) {
        const list = self.value.split(sep.value).map(value => NewPlStuff(PlStuffType.Str, value));
        return NewPlStuff(PlStuffType.List, list);
    }),
    [ScrambleType("remove", PlStuffType.Str)]: GenerateGuardedTypeFunction("remove", [PlStuffType.Num], (self, index) => {
        const value: string = self.value;
        const idx = index.value - 1;
        if (idx < 0 || idx >= value.length) {
            throw new Error(MakeOutOfRangeMessage("remove", PlStuffType.Str, value.length, index.value));
        }

        const out = value.substring(0, idx) + value.substring(idx+1);
        return NewPlStuff(PlStuffType.Str, out);
    }),
    [ScrambleType("substring", PlStuffType.Str)]: GenerateGuardedTypeFunction("substring", [PlStuffType.Num, PlStuffType.Num], (self, start, end) => {
        return NewPlStuff(PlStuffType.Str, self.value.substring(start.value-1, end.value));
    })
}
