import {PlStuff} from "./stuff";
import {PlTraceFrame} from "../../problem/trace";
import {PlFileInfo} from "../../compiler/lexing/info";


/**
 * A stack frame contains a map of key,value pairs, any outer stack frames, and a trace for debug purposes
 */
export class PlStackFrame {
    values: Record<string, PlStuff>; // The values in this frame
    outer: PlStackFrame | null;      // Any outer frames

    trace: PlTraceFrame | null;      // The debug trace, null if it is a shallow frame

    constructor(outer: PlStackFrame | null, trace: PlTraceFrame | null = null) {
        this.trace = trace;
        this.outer = outer;
        this.values = {};
    }

    /**
     * If this stack frame is shallow - that it is not a function call
     */
    get isShallow() {
        return this.trace == null;
    }

    get isFunction() {
        return this.trace != null;
    }

    /**
     * Sets the debug name for this trace
     * @param name The debug name
     */
    setTraceName(name: string) {
        if (this.trace == null) {
            return this;
        }
        this.trace.name = name;
        return this;
    }

    /**
     * Sets the debug info for this trace
     * @param info The debug info
     */
    setTraceInfo(info: PlFileInfo) {
        if (this.trace == null) {
            return this;
        }
        this.trace.info = info;
        return this;
    }

    /**
     * Shallow find a value in this frame and out
     *
     * Shallow meaning that it will not look for a value outside of the containing function call
     * @param key The key to look for
     */
    findValue(key: string): PlStuff | null {
        let outer: PlStackFrame = this;
        do {
            const value = outer.values[key];
            if (value) return value;
            if (!outer.isShallow) {
                return null;
            }
            outer = outer.outer;
        } while (outer != null);
        return null;
    }

    /**
     * Deep find a value in this frame and out
     * @param key The key to look for
     */
    findValueDeep(key: string): PlStuff | null {
        let outer: PlStackFrame = this;
        do {
            const value = outer.values[key];
            if (value) return value;
            outer = outer.outer;
        } while (outer != null);

        return null;
    }

    /**
     * Assign to a value or create a new value in the frame and out
     * @param key The value name
     * @param value The value value
     */
    setValueOuter(key: string, value: PlStuff) {
        // First try to see if the value exists in the current scope
        if (key in this.values) {
            this.values[key] = value;
            return;
        }

        // Then create the value if cannot find it outside anywhere
        if (this.outer == null || this.outer.findValueDeep(key) == null) {
            this.setValueLocal(key, value);
            return;
        }

        // This means that it is somewhere outside, so we try to find it and assign it
        let outer = this.outer;
        while (outer != null) {
            if (key in outer.values) {
                outer.values[key] = value;
                return;
            }
            outer = outer.outer;
        }
    }

    /**
     * Set a value in the current scope
     * @param key The name of the value
     * @param value The value of the value
     */
    setValueInner(key: string, value: PlStuff) {
        let outer: PlStackFrame = this;
        do {
            const exist = outer.values[key];
            if (exist) {
                outer.values[key] = value;
                return;
            }
            if (!outer.isShallow) {
                break;
            }
            outer = outer.outer;
        } while (outer != null);

        // create if not exist
        this.setValueLocal(key, value);
    }

    setValueLocal(key: string, value: PlStuff) {
        this.values[key] = value;
    }
}
