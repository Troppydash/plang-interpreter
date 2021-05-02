import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType, PlStuffTypeToString} from "../stuff";
import {PlFunction, PlNativeFunction} from "../memory";

export namespace PlConverter {
    export function PlToJs(object: PlStuff): any {
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
                return object.value.map(v => PlToJs(v));
            }
            case PlStuffType.Dict: {
                const out = {};
                Object.entries(object.value).forEach(([key, value]) => {
                    out[key] = PlToJs(value as PlStuff);
                });
                return out;
            }
            case PlStuffType.NFunc: {
                const value = object.value as PlNativeFunction;
                return value.native;
            }
            case PlStuffType.Func: {
                const value = object.value as PlFunction;
                // TODO: think of how to do this
                return "[function]";
            }
        }
        throw new Error("Unimplemented convert from pltojs");
    }

    export function JsToPl(object: any): PlStuff {
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
                        return JsToPl(object(...args.map(a => PlToJs(a))));
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
                    return NewPlStuff(PlStuffType.List, object.map(i => JsToPl(i)));
                }
                const obj = {};
                for (const [key, value] of Object.entries(object)) {
                    obj[key] = JsToPl(value);
                }
                return NewPlStuff(PlStuffType.Dict, obj);
            }
        }
        throw new Error("Unimplemented from jstopl");
    }
}

export namespace PlActions {
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
        throw new Error("Type not implemented for copy");
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
        throw new Error("Type not implemented for copy");
    }
}
