import { ScrambleFunction } from "../../scrambler";
import { NewPlStuff, PlStuff, PlStuffType } from "../../stuff";
import { assertType, assertTypeof, expectedNArguments, ExportJs, ExportNative } from "../helpers";

export const jsStr: ExportJs = {
    [ScrambleFunction("size", PlStuffType.Str)]: function(self) {
        expectedNArguments(0, arguments);
        return self.length;
    },
    [ScrambleFunction("have", PlStuffType.Str)]: function(l, r) {
        expectedNArguments(1, arguments);
        assertTypeof(r, "string", "'have' needs a string as an argument");
        return l.indexOf(r) != -1;
    },
    [ScrambleFunction("get", PlStuffType.Str)]: function(self: string, index: number) {
        expectedNArguments(1, arguments);
        assertTypeof(index, "number", "'get' needs a number as an argument");
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error("string index out of range");
        }
        return self[index];
    },
    [ScrambleFunction("replace", PlStuffType.Str)]: function(self, index, value) {
        expectedNArguments(2, arguments);
        assertTypeof(index, "number", "'replace' needs a number as the first argument");
        assertTypeof(value,  "string", "'replace' needs a string as the second argument");
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error("string index out of range");
        }
        return self.substring(0, index) + value + self.substring(index+1);
    },
    [ScrambleFunction("insert", PlStuffType.Str)]: function(self, index, value) {
        expectedNArguments(2, arguments);
        assertTypeof(index, "number", "'insert' needs a number as the first argument");
        assertTypeof(value,  "string", "'insert' needs a string as the second argument");
        index--;
        if (index < 0 || index >= self.length) {
            throw new Error("string index out of range");
        }
        return self.substring(0, index) + value + self.substring(index)
    },
    [ScrambleFunction("index", PlStuffType.Str)]: function(self: string, value) {
        expectedNArguments(1, arguments);
        assertTypeof(value,  "string", "'set' needs a string as the second argument");
        const result = self.indexOf(value);
        return result == -1 ? null : result+1;
    },
    [ScrambleFunction("iter", PlStuffType.Str)]: function(self: string) {
        let index = 0;
        return {
            next: () => {
                if (index >= self.length) {
                    return [null, false];
                }
                return [[self[index++], index], true];
            }
        }
    },
    [ScrambleFunction("upper", PlStuffType.Str)]: function(self: string) {
        expectedNArguments(0, arguments);
        return self.toUpperCase();
    },
    [ScrambleFunction("lower", PlStuffType.Str)]: function(self: string) {
        expectedNArguments(0, arguments);
        return self.toLowerCase();
    },
};

export const str: ExportNative = {

}
