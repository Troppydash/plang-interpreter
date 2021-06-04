import {TypeofTypes} from "../../extension";
import {PlStackFrame} from "./memory";

/**
 * All possible devia stuff types
 */
export enum PlStuffType {
    Num,
    Str,
    Bool,
    Null,
    Type,
    Func,
    NFunc,
    List,
    Dict,
    Inst,
}

// The plstufftypes in string form
export const PlStuffTypes = ["Num", "Str", "Bool", "Null", "Type", "Func", "List", "Dict", "Inst"] as const;
// The union type of the plstufftypes
export type PlStuffTypeStrings = typeof PlStuffTypes[number];
// the union type of the values of a devia object
type PlStuffValue = PlFunction | PlNativeFunction | PlInstance | PlType | any;

/**
 * The values for a devia object
 */
export interface PlStuff {
    type: PlStuffType; // The type of the object
    value: PlStuffValue; // The value of the object
}

export function NewPlStuff(type: PlStuffType, value: any): PlStuff {
    return {
        type,
        value
    };
}


export interface PlStuffFunction extends PlStuff {
    value: PlFunction;
}

export interface PlStuffNativeFunction extends PlStuff {
    value: PlNativeFunction;
}

export interface PlStuffInstance extends PlStuff {
    value: PlInstance;
}

export interface PlStuffT extends PlStuff {
    value: PlType;
}



/// These are possible types for the plstuff.value field ///
export interface PlFunction {
    index: number; // index of bytecode
    closure: PlStackFrame; // closure stack frame
    parameters: string[]; // parameter names
    self?: PlStuff; // self for overloading
}

export interface PlNativeFunction {
    native: Function;
    name: string;
    self?: PlStuff;
}

export interface PlInstance {
    type: string; // true instance type
    value: Record<string, PlStuff>; // instance value
}

export interface PlType {
    type: string;
    format: any;
}


/**
 * Converts a js string to a plstufftype enum
 * @param string The js string
 * @constructor
 */
export function PlStuffTypeFromString(string: string): PlStuffType {
    if (string in PlStuffType) {
        return PlStuffType[string];
    }
    throw new Error(`PlStuffTypeFromString failed to match with value ${string}`);
}

/**
 * Converts a js typeof result string to a plstufftype enum
 * @param string The js typeof result
 * @constructor
 */
export function PlStuffTypeFromJsString(string: TypeofTypes): PlStuffType {
    switch (string) {
        case "boolean":
            return PlStuffType.Bool;
        case "function":
            return PlStuffType.Func;
        case "number":
            return PlStuffType.Num;
        case "string":
            return PlStuffType.Str;
        case "undefined":
            return PlStuffType.Null;
        case "object":
            return PlStuffType.Dict;
    }
    throw new Error(`PlStuffTypeFromJsString failed to match with value ${string}`);

}

/**
 * Converts a plstufftype enum to string
 * @param stuffType The plstufftype enum
 * @constructor
 */
export function PlStuffTypeToString(stuffType: PlStuffType): PlStuffTypeStrings {
    switch (stuffType) {
        case PlStuffType.Num:
            return "Num";
        case PlStuffType.Type:
            return "Type";
        case PlStuffType.Func:
        case PlStuffType.NFunc:
            return "Func";
        case PlStuffType.Bool:
            return "Bool";
        case PlStuffType.Str:
            return "Str"
        case PlStuffType.Null:
            return "Null";
        case PlStuffType.List:
            return "List";
        case PlStuffType.Inst:
            return "Inst";
        case PlStuffType.Dict:
            return "Dict";
    }
    throw new Error(`PlStuffTypeToString failed to match with value ${stuffType}`);
}

/**
 * Returns the real type of a devia object, can be a non expected string that is not a plstufftype string
 * @param stuff
 * @constructor
 */
export function PlStuffGetType(stuff: PlStuff): PlStuffTypeStrings | string {
    switch (stuff.type) {
        case PlStuffType.Inst:
            return stuff.value.type;
    }
    return PlStuffTypeToString(stuff.type);
}

/// There can be only one of these, so we don't make them up but rather use these ///
// TODO: make them frozen
export const PlStuffTrue = NewPlStuff(PlStuffType.Bool, true);
export const PlStuffFalse = NewPlStuff(PlStuffType.Bool, false);
export const PlStuffNull = NewPlStuff(PlStuffType.Null, null);

