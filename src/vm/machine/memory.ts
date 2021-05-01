import { PlStuff } from "./stuff";
import { PlProgramWithDebug } from "../emitter";
import { PlTraceFrame } from "../../problem/trace";
import { PlFileInfo } from "../../compiler/lexing/info";


export class PlStackFrame {
    values: Record<string, PlStuff>;
    outer: PlStackFrame | null;

    trace: PlTraceFrame | null;

    constructor(outer: PlStackFrame | null, trace: PlTraceFrame | null = null) {
        this.trace = trace;
        this.outer = outer;
        this.values = {};
    }

    setTraceName(name: string) {
        if (this.trace == null) {
            return this;
        }
        this.trace.name = name;
        return this;
    }

    setTraceInfo(info: PlFileInfo) {
        if (this.trace == null) {
            return this;
        }
        this.trace.info = info;
        return this;
    }

    findValue(key: string): PlStuff | null {
        if (key in this.values) {
            return this.values[key];
        }

        if (this.trace != null) {
            return null;
        }

        let outer = this.outer;
        while (outer != null) {
            if (key in outer.values) {
                return outer.values[key];
            }
            if (outer.trace != null ) {
                return null;
            }
            outer = outer.outer;
        }
        return null;
    }

    findValueDeep( key: string): PlStuff | null {
        // non recursive way see if it works
        if (key in this.values) {
            return this.values[key];
        }

        let outer = this.outer;
        while (outer != null) {
            if (key in outer.values) {
                return outer.values[key];
            }
            outer = outer.outer;
        }

        return null;
    }

    setValue(key: string, value: PlStuff) {
        if (key in this.values) {
            this.values[key] = value;
            return;
        }
        if (this.outer == null || this.outer.findValueDeep(key) == null) {
            this.createValue(key, value);
            return;
        }
        let outer = this.outer;
        while (outer != null) {
            if (key in outer.values) {
                outer.values[key] = value;
                return;
            }
            outer = outer.outer;
        }
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
    self?: PlStuff;
}

export interface PlNativeFunction {
    callback: Function;
    native: Function;
    self?: PlStuff;
}
