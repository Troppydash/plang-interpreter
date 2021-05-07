import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType, PlStuffTypeToString} from "../stuff";
import {PlFunction, PlNativeFunction} from "../memory";
import {PlProgramWithDebug} from "../../emitter";
import {PlDebugWithin} from "../../emitter/debug";
import {PlInout} from "../../../inout";
import {PlStackMachine} from "../index";

export namespace PlConverter {
    // plang type to js type
    export function PlToJs(object: PlStuff, runFunction: Function): any {
        switch (object.type) {
            case PlStuffType.Str: {
                return object.value;
            }
            case PlStuffType.Num: {
                return +object.value;
            }
            case PlStuffType.Type: {
                return PlStuffTypeToString(object.value);
            }
            case PlStuffType.Bool: {
                return object.value;
            }
            case PlStuffType.Null: {
                return null;
            }
            case PlStuffType.List: {
                return object.value.map(v => PlToJs(v, runFunction));
            }
            case PlStuffType.Dict: {
                const out = {};
                Object.entries(object.value).forEach(([key, value]) => {
                    out[key] = PlToJs(value as PlStuff, runFunction);
                });
                return out;
            }
            case PlStuffType.NFunc: {
                const value = object.value as PlNativeFunction;
                return value.native;
            }
            case PlStuffType.Func: {
                return (...args) => {
                    return PlToJs(runFunction(object, ...args), runFunction);
                };
            }
        }
        throw new Error(`PlConvert.PlToJs failed to match object of type ${PlStuffTypeToString(object.type)}`);
    }

    // js type to plang type
    export function JsToPl(object: any, runFunction: Function): PlStuff {
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
                return NewPlStuff(PlStuffType.NFunc, {
                    callback: function (...args) {
                        return JsToPl(object(...args.map(a => PlToJs(a, runFunction))), runFunction);
                    },
                    native: object
                });
            }
            case "undefined": {
                return PlStuffNull;
            }
            case "object": {
                if (object == null) {
                    return PlStuffNull;
                }
                if (Array.isArray(object)) {
                    return NewPlStuff(PlStuffType.List, object.map(i => JsToPl(i, runFunction)));
                }
                const obj = {};
                for (const [key, value] of Object.entries(object)) {
                    obj[key] = JsToPl(value, runFunction);
                }
                return NewPlStuff(PlStuffType.Dict, obj);
            }
        }
        throw new Error(`PlConvert.JsToPl failed to match object of type ${typeof object}`);
    }
}

export namespace PlActions {
    // to string
    export function PlToString(object: PlStuff): string {
        switch (object.type) {
            case PlStuffType.Bool:
                return object.value ? "true" : "false";
            case PlStuffType.Dict:
                return "[dictionary]";
            case PlStuffType.NFunc:
            case PlStuffType.Func:
                return "[function]";
            case PlStuffType.List:
                return `list(${object.value.map(v => PlToString(v)).join(', ')})`;
            case PlStuffType.Null:
                return "null";
            case PlStuffType.Num:
                return "" + object.value;
            case PlStuffType.Str:
                return `${object.value}`;
            case PlStuffType.Type:
                return `${PlStuffTypeToString(object.value)}`;
        }
        throw new Error(`PlActions.PlToString failed to match object of type ${PlStuffTypeToString(object.type)}`);
    }

    // shallow copying
    export function PlCopy(object: PlStuff): PlStuff {
        const {type, value} = object;
        switch (type) {
            case PlStuffType.Num:
            case PlStuffType.Str:
            case PlStuffType.List:
            case PlStuffType.Func:
            case PlStuffType.Dict:
                return NewPlStuff(type, value);

            case PlStuffType.Type:
            case PlStuffType.Null:
            case PlStuffType.Bool:
            case PlStuffType.NFunc:
                return object;
        }
        throw new Error(`PlActions.PlCopy failed to match type ${PlStuffTypeToString(object.type)}`);
    }

    // deep cloning
    export function PlClone(object: PlStuff): PlStuff {
        const {type, value} = object;
        switch (type) {
            case PlStuffType.Num:
            case PlStuffType.Str:
                return NewPlStuff(type, value);

            case PlStuffType.List:
                return NewPlStuff(type, value.map(v => PlClone(v)));
            case PlStuffType.Func:
                return NewPlStuff(type, {...value});
            case PlStuffType.Dict:
                const newObj = {};
                Object.entries(value).forEach(([k, v]) => {
                    newObj[k] = PlClone(v as PlStuff);
                });
                return NewPlStuff(type, newObj);
            case PlStuffType.Type:
            case PlStuffType.Null:
            case PlStuffType.Bool:
            case PlStuffType.NFunc:
                return object;
        }
        throw new Error(`PlActions.PlClone failed to match type ${PlStuffTypeToString(object.type)}`);
    }
}
