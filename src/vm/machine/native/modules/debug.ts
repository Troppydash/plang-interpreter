import {GenerateJsGuardedFunction} from "../helpers";
import {StackMachine} from "../../index";
import {PlConverter} from "../converter";
import {PlProgramToString} from "../../../emitter/printer";

const debug = {
        stack: GenerateJsGuardedFunction("stack", [], function (this: StackMachine) {
            return this.stack.map(i => PlConverter.PlToJs(i, this));
        }),
        closure: GenerateJsGuardedFunction("closure", [], function (this: StackMachine) {
            const values = {};
            for (const [key, value] of Object.entries(this.closureFrame.values)) {
                values[key] = PlConverter.PlToJs(value, this);
            }
            return values;
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
        program: GenerateJsGuardedFunction("program", [], function (this: StackMachine) {
            return PlProgramToString(this.program, false).split('\n');
        }),
        pointer: GenerateJsGuardedFunction("pointer", [], function (this: StackMachine) {
            return this.pointer;
        }),
        debugger: GenerateJsGuardedFunction("debugger", [], function (this: StackMachine) {

        })
};

export const jsdebug = {
    debug
};
