import {ScrambleFunction} from "../../scrambler";
import {PlStuffType} from "../../stuff";
import {
    GenerateJsGuardedTypeFunction
} from "../helpers";
import {ExportJs, ExportNative} from "../types";
import {MakeOutOfRangeMessage} from "../messeger";

export const jsStr: ExportJs = {
    [ScrambleFunction("size", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("size", [], function (self) {
        return self.length;
    }),
    [ScrambleFunction("have", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("size", ["string"], function (l, r) {
        return l.indexOf(r) != -1;
    }),
    [ScrambleFunction("get", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("get", ["number"], function (self: string, index: number) {
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error(MakeOutOfRangeMessage("get", PlStuffType.Str, self.length, index+1));
        }
        return self[index];
    }),
    [ScrambleFunction("replace", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("replace", ["number", "string"], function (self, index, value) {
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error(MakeOutOfRangeMessage("replace", PlStuffType.Str, self.length, index+1));
        }
        return self.substring(0, index) + value + self.substring(index + 1);
    }),
    [ScrambleFunction("insert", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("insert", ["number", "string"], function (self, index, value) {
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error(MakeOutOfRangeMessage("insert", PlStuffType.Str, self.length, index+1));
        }
        return self.substring(0, index) + value + self.substring(index)
    }),
    [ScrambleFunction("find", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("find", ["string"], function (self: string, value) {
        const result = self.indexOf(value);
        return result == -1 ? null : result + 1;
    }),
    [ScrambleFunction("iter", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("iter", [], function (self: string) {
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
    [ScrambleFunction("upper", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("upper", [], function (self: string) {
        return self.toUpperCase();
    }),
    [ScrambleFunction("lower", PlStuffType.Str)]: GenerateJsGuardedTypeFunction("lower", [], function (self: string) {
        return self.toLowerCase();
    }),
};

export const str: ExportNative = {}
