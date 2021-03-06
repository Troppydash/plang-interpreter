import {
    NewPlStuff, PlFunction,
    PlInstance,
    PlNativeFunction,
    PlStuff,
    PlStuffFalse,
    PlStuffGetType,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeFromString,
    PlStuffTypeRest,
    PlStuffTypeToString,
    PlType
} from "../stuff";
import {StackMachine} from "../index";
import {ReportProblems} from "../../../problem";

/**
 * Protects a plang like function call
 * @param callback The function call
 * @param sm The stack machine
 */
function protectPlangCall(callback: Function, sm: StackMachine) {
    return (...args) => {
        // if the caller is a js callback
        const caller = (new Error()).stack.split("\n")[2].trim().split(" ")[1];
        // This is very hacky, but js had forced myhand
        if (caller == undefined || !caller.includes("PlStackMachine")) {
            const saved = sm.saveState();
            try {
                return callback(...args);
            } catch (e) {
                debugger;
                sm.restoreState(saved);
                const problem = sm.problems.pop();
                const trace = sm.getTrace();
                ReportProblems(sm.file.content, [problem], trace);
                return null;
            }
        }

        return callback(...args);
    }
}

/**
 * Houses the conversion between devia and js types
 */
export namespace PlConverter {
    export const VERSION = 1; // Converter version

    interface CustomValue {
        _version: number;
        type: "Instance" | "Type" | "Raw";
        value: any
    }

    /**
     * Convert an devia instance to js
     * @param instance The devia instance
     * @param sm The stack machine
     * @private
     */
    function instanceToJs(instance: PlInstance, sm: StackMachine): CustomValue {
        const out = {};
        Object.entries(instance.value).forEach(([key, value]) => {
            out[key] = PlToJs(value as PlStuff, sm);
        });

        // custom js instance format
        return {
            _version: VERSION,
            type: "Instance",
            value: {
                type: instance.type,
                value: out
            }
        };
    }

    /**
     * Check if an js object is a valid devia custom stuff
     * @param js The js object
     * @private
     */
    function jsIsCustom(js: CustomValue): boolean {
        if ("_version" in js) {
            switch (js["_version"]) {
                case 1:
                    if ("type" in js && typeof js["type"] == "string") {
                        if ("value" in js && js["value"] !== null) {
                            return true;
                        }
                    }
                    return false;
                default:
                    return false;
            }
        }
        return false;
    }

    /**
     * Converts an js object to a devia instance
     * @param js The js object
     * @param sm The stack machine
     * @private
     */
    function jsToInstance(js: CustomValue, sm: StackMachine): PlStuff {
        const out = {};
        for (const [key, value] of Object.entries(js.value.value)) {
            out[key] = JsToPl(value, sm);
        }
        return NewPlStuff(PlStuffType.Inst, {
            type: js.value.type,
            value: out
        } as PlInstance);
    }

    function typeToJs(type: PlStuff): CustomValue {
        return {
            _version: VERSION,
            type: "Type",
            value: {
                type: type.value.type,
                format: type.value.format
            }
        };
    }

    function jsToType(js: CustomValue): PlStuff {
        return NewPlStuff(PlStuffType.Type, {
            type: js.value.type,
            format: js.value.format
        } as PlType);
    }

    function jsToRaw(js: CustomValue): PlStuff {
        return NewPlStuff(PlStuffType.Raw, js.value);
    }

    function rawToJs(raw: PlStuff): CustomValue {
        return {
            _version: VERSION,
            type: "Raw",
            value: raw.value
        };
    }

    /**
     * Converts a devia object to js
     * @param object The devia object
     * @param sm The stack machine
     * @constructor
     */
    export function PlToJs(object: PlStuff, sm: StackMachine): any {
        switch (object.type) {
            case PlStuffType.Str: {
                return object.value;
            }
            case PlStuffType.Num: {
                return +object.value;
            }
            case PlStuffType.Type: {
                return typeToJs(object);
            }
            case PlStuffType.Bool: {
                return object.value;
            }
            case PlStuffType.Null: {
                return null;
            }
            case PlStuffType.List: {
                return object.value.map(v => PlToJs(v, sm));
            }
            case PlStuffType.Inst: {
                const value = object.value as PlInstance;
                return instanceToJs(value, sm);
            }
            case PlStuffType.Dict: {
                const out = {};
                Object.entries(object.value).forEach(([key, value]) => {
                    out[key] = PlToJs(value as PlStuff, sm);
                });
                return out;
            }
            case PlStuffType.NFunc: {
                const fn = ((...args) => {
                    return PlToJs(object.value.native(...args.map(a => JsToPl(a, sm))), sm);
                });
                (fn as any).data = (object.value as PlNativeFunction);  // save data
                return fn;
            }
            case PlStuffType.Func: {
                const callPointer = sm.pointer;
                const fn = protectPlangCall((...args) => {
                    return PlToJs(sm.runFunction(object, args.map(arg => JsToPl(arg, sm)), callPointer), sm);
                }, sm);
                (fn as any).data = (object.value as PlFunction);  // save data
                return fn;
            }
            case PlStuffType.Raw:
                return rawToJs(object);
        }
        throw new Error(`PlConvert.PlToJs failed to match object of type ${PlStuffTypeToString(object.type)}`);
    }

    /**
     * Converts a js object to devia
     * @param object The js object
     * @param sm The stack machine
     * @constructor
     */
    export function JsToPl(object: any, sm: StackMachine): PlStuff {
        switch (typeof object) {
            case "number": {
                return NewPlStuff(PlStuffType.Num, object);
            }
            case "string": {
                return NewPlStuff(PlStuffType.Str, object);
            }
            case "boolean": {
                if (object) {
                    return PlStuffTrue;
                }
                return PlStuffFalse;
            }
            case "function": {
                let additional = {};  // restore data saved
                if (object.data) {
                    additional = object.data;
                }
                return NewPlStuff(PlStuffType.NFunc, {
                    native: (...args) => {
                        return JsToPl(object.bind(sm)(...args.map(a => PlToJs(a, sm))), sm);
                    },
                    name: "native",
                    parameters: [PlStuffTypeRest],
                    self: null,
                    ...additional
                } as PlNativeFunction);
            }
            case "undefined": {
                return PlStuffNull;
            }
            case "object": {
                if (object == null) {
                    return PlStuffNull;
                }
                if (Array.isArray(object)) {
                    return NewPlStuff(PlStuffType.List, object.map(i => JsToPl(i, sm)));
                }

                if (jsIsCustom(object)) {
                    switch ((object as CustomValue).type) {
                        case "Instance":
                            return jsToInstance(object, sm);
                        case "Type":
                            return jsToType(object);
                        case "Raw":
                            return jsToRaw(object);
                    }
                }

                const obj = {};
                for (const [key, value] of Object.entries(object)) {
                    obj[key] = JsToPl(value, sm);
                }
                return NewPlStuff(PlStuffType.Dict, obj);
            }
        }
        throw new Error(`PlConvert.JsToPl failed to match object of type ${typeof object}`);
    }

    /**
     * Converts a devia type to another devia type
     * @param source The source devia object
     * @param target The target devia
     * @param sm
     * @constructor
     */
    export function PlToPl(source: PlStuff, target: PlType, sm: StackMachine): PlStuff {
        // Cannot convert anything to an INST type
        if (target.format != null) {
            return PlStuffNull;
        }

        // Checks if the source type is the target type, return the source directly if so
        const sourceStr = PlStuffGetType(source);
        const targetStr = target.type;
        if (sourceStr == targetStr) {
            return source;
        }

        // Turn the target type to an enum type
        const targetType: PlStuffType = PlStuffTypeFromString(targetStr);
        switch (targetType) {
            case PlStuffType.Dict:
            case PlStuffType.Inst:
            case PlStuffType.Func:
            case PlStuffType.NFunc:
            case PlStuffType.List:
            case PlStuffType.Null:
            case PlStuffType.Type:
                return PlStuffNull; // These cannot be converted

            case PlStuffType.Bool: {
                let out;
                switch (source.type) {
                    case PlStuffType.Num:
                        out = source.value != 0;
                        break;
                    case PlStuffType.List:
                    case PlStuffType.Str:
                        out = source.value.length != 0;
                        break;
                    case PlStuffType.Dict:
                        out = Object.keys(source.value).length != 0;
                        break;

                    case PlStuffType.NFunc:
                    case PlStuffType.Inst:
                    case PlStuffType.Func:
                    case PlStuffType.Type:
                        out = true;
                        break;
                    case PlStuffType.Null:
                        out = false;
                        break;
                }
                return out == true ? PlStuffTrue : PlStuffFalse;
            } // IsTruthy kinda
            case PlStuffType.Num: {
                let num = null;
                switch (source.type) {
                    case PlStuffType.Bool:
                        num = source.value == true ? 1 : 0;
                        break;
                    case PlStuffType.Str: {
                        const out = parseFloat(source.value);
                        if (!isNaN(out)) {
                            num = out;
                            break;
                        } else
                            return PlStuffNull;
                    }
                    case PlStuffType.Null:
                        num = 0;
                        break;

                    case PlStuffType.Inst:
                    case PlStuffType.NFunc:
                    case PlStuffType.Dict:
                    case PlStuffType.List:
                    case PlStuffType.Func:
                    case PlStuffType.Type:
                        return PlStuffNull;
                }
                return NewPlStuff(PlStuffType.Num, num);
            } // To int
            case PlStuffType.Str: {
                return NewPlStuff(PlStuffType.Str, PlToString(source, sm));
            } // calls the to string
        }

        return PlStuffNull; // Default to returning null
    }

    /**
     * Converts a devia object to a js string
     * @param object The devia object
     * @param sm The stack machine
     * @param quote Whether to quote the strings if the object is a string, this is used for nesting strings
     * @constructor
     */
    export function PlToString(object: PlStuff, sm: StackMachine, quote: boolean = false): string {
        switch (object.type) {
            case PlStuffType.Bool:
                return object.value ? "true" : "false";
            case PlStuffType.Dict:
                return `dict(${Object.entries(object.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToString(value, sm, true)}`).join(', ')})`;
            case PlStuffType.NFunc:
            case PlStuffType.Func:
                return `[function]`;
            case PlStuffType.List:
                return `list(${object.value.map(v => PlToString(v, sm, true)).join(', ')})`;
            case PlStuffType.Null:
                return "null";
            case PlStuffType.Num:
                return "" + object.value;
            case PlStuffType.Str:
                if (quote) {
                    return `"${object.value}"`;
                }
                return object.value;
            case PlStuffType.Type:
                return object.value.type;
            case PlStuffType.Raw:
                return "[raw]"
            case PlStuffType.Inst: {
                let fn;
                if ((fn = sm.findFunction("str", object))) {
                    const out = sm.runFunction(fn, [object]);
                    return PlToString(out, sm, quote);
                } else {
                    return `${(object.value as PlInstance).type}(${Object.entries(object.value.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToString(value, sm, true)}`).join(', ')})`
                }
            }
        }
        throw new Error(`PlActions.PlToString failed to match object of type ${PlStuffTypeToString(object.type)}`);
    }

    /**
     * Returns the string representation of the object for debugging
     * @param object The stuff to be repr
     * @constructor
     */
    export function PlToDebugString(object: PlStuff): string {
        switch (object.type) {
            case PlStuffType.Bool:
                return object.value ? "true" : 'false';
            case PlStuffType.Dict:
                return `Dict(${Object.entries(object.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToDebugString(value,)}`).join(', ')})`;
            case PlStuffType.Null:
                return "null";
            case PlStuffType.Inst:
                return `${(object.value as PlInstance).type}(${Object.entries(object.value.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToDebugString(value)}`).join(',\n')}\n)`;
            case PlStuffType.List:
                return `List(${object.value.map(v => PlToDebugString(v)).join(', ')})`;
            case PlStuffType.Raw:
                return '[raw]'
            case PlStuffType.Func: {
                const params = [];
                if (object.value.self)
                    params.push(`self=${PlToDebugString(object.value.self)}`);
                for (const param of object.value.parameters) {
                    params.push(param);
                }
                return `Func(${params.join(', ')}) -> Any`;
            }
            case PlStuffType.NFunc: {
                const params = [];
                if (object.value.self)
                    params.push(`self=${PlToDebugString(object.value.self)}`);
                for (const type of object.value.parameters) {
                    if (typeof type == "string") {
                        params.push(type);
                        continue;
                    }
                    params.push(PlStuffTypeToString(type));
                }
                return `NFunc(${params.join(', ')}) -> Any`;
            }
            case PlStuffType.Num:
                return "" + object.value;
            case PlStuffType.Str:
                return `"${object.value}"`;
            case PlStuffType.Type:
                return `Type(${object.value.type})`;
        }
        throw new Error("PlToDebugString failed to match an object");
    }
}

/**
 * These are the common actions that can be done on devia stuffs
 */
export namespace PlActions {

    /**
     * This shallow copies the devia object,
     * the default used in function calling
     * @param object The devia object to be copied
     * @constructor
     */
    export function PlCopy(object: PlStuff): PlStuff {
        const {type, value} = object;
        switch (type) {
            case PlStuffType.Num:
            case PlStuffType.Str:
            case PlStuffType.List:
            case PlStuffType.Dict:
                return NewPlStuff(type, value);

            case PlStuffType.Raw:
            case PlStuffType.Inst:
            case PlStuffType.Type:
            case PlStuffType.Bool:
            case PlStuffType.Null:
                return object;

            case PlStuffType.Func:
            case PlStuffType.NFunc:
                return NewPlStuff(type, {...value});
        }
        throw new Error(`PlActions.PlCopy failed to match type ${PlStuffTypeToString(object.type)}`);
    }

    /**
     * This deep clones the devia object
     * @param object The object to be cloned
     * @constructor
     */
    export function PlClone(object: PlStuff): PlStuff {
        const {type, value} = object;
        switch (type) {
            case PlStuffType.Num:
            case PlStuffType.Str:
                return NewPlStuff(type, value);

            case PlStuffType.List:
                return NewPlStuff(type, value.map(v => PlClone(v)));

            case PlStuffType.Func:
            case PlStuffType.NFunc:
                return NewPlStuff(type, {...value});

            case PlStuffType.Inst: {
                const newObj = {};
                Object.entries(value.value).forEach(([k, v]) => {
                    newObj[k] = PlClone(v as PlStuff);
                });
                return NewPlStuff(type, {
                    type: value.type,
                    value: newObj
                } as PlInstance);
            }
            case PlStuffType.Dict: {
                const newObj = {};
                Object.entries(value).forEach(([k, v]) => {
                    newObj[k] = PlClone(v as PlStuff);
                });
                return NewPlStuff(type, newObj);
            }
            case PlStuffType.Raw:
            case PlStuffType.Type:
            case PlStuffType.Null:
            case PlStuffType.Bool:
                return object;
        }
        throw new Error(`PlActions.PlClone failed to match type ${PlStuffTypeToString(object.type)}`);
    }
}
