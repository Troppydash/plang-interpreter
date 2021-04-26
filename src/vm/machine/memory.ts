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
        if (this.outer && this.trace == null) {
            return this.outer.findValue(key);
        }
        return null;
    }

    findValueDeep( key: string): PlStuff | null {
        if (key in this.values) {
            return this.values[key];
        }
        if (this.outer) {
            return this.outer.findValueDeep(key);
        }
        return null;
    }

    setValue(key: string, value: PlStuff) {
        if (key in this.values) {
            this.values[key] = value;
            return;
        }
        if (this.outer && this.outer.findValueDeep(key) != null) {
            return this.outer.setValue(key, value);
        }
        this.createValue(key, value);
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
