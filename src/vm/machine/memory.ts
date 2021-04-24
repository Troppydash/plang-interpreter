import { PlProgram } from "../emitter/bytecode";
import { PlStuff } from "./stuff";
import { PlDebugProgram } from "../emitter/debug";
import { PlProgramWithDebug } from "../emitter";


export class PlStackFrame {
    values: Record<string, PlStuff>;
    outer: PlStackFrame | null;

    constructor(outer: PlStackFrame | null) {
        this.outer = outer;
        this.values = {};
    }

    findValue(key: string): PlStuff | null {
        if (key in this.values) {
            return this.values[key];
        }
        if (this.outer) {
            return this.outer.findValue(key);
        }
        return null;
    }

    setValue(key: string, value: PlStuff) {
        if (this.outer.findValue(key) != null) {
            return this.outer.setValue(key, value);
        }
        this.values[key] = value;
    }

    createValue(key: string, value: PlStuff) {
        this.values[key] = value;
    }
}


// functions
export interface PlFunction {
    stackFrame: PlStackFrame;
    bytecode: PlProgramWithDebug;
    parameters: PlStuff[];
}

export interface PlNativeFunction {
    callback: Function;
}
