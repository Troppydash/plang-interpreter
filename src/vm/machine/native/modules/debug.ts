import {GenerateGuardedFunction, GenerateJsGuardedFunction} from "../helpers";
import {StackMachine} from "../../index";
import {NewPlStuff, PlStuffType} from "../../stuff";
import {PlConverter} from "../converter";

export const debug = {
    debug: {
        stack: GenerateJsGuardedFunction("stack", [], function (this: StackMachine) {
            return this.stack.map(i => PlConverter.PlToJs(i, this));
        }),
        locals: GenerateJsGuardedFunction("locals", [], function (this: StackMachine) {
            const values = {};
            for (const [key, value] of Object.entries(this.stackFrame.values)) {
                values[key] = PlConverter.PlToJs(value, this);
            }
            return values;
        }),
        globals: GenerateJsGuardedFunction("globals", [], function (this: StackMachine) {
            let out = {};
            let sf = this.stackFrame;
            do {
                const values = {};
                for (const [key, value] of Object.entries(sf.values)) {
                    values[key] = PlConverter.PlToJs(value, this);
                }
                out = {...out, ...values};
            } while ((sf = sf.outer) != null);
            return out;
        }),


    },
}
