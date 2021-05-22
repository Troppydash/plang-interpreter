import {
    NewPlStuff,
    PlStuff,
    PlStuffFalse,
    PlStuffGetType,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeFromString,
    PlStuffTypeToString
} from "../stuff";
import { PlInstance } from "../memory";
import { StackMachine } from "../index";

export namespace PlConverter {
    const VERSION = 1;

    function instanceToJs(instance: PlInstance, sm: StackMachine) {
        const out = {};
        Object.entries(instance.value).forEach(([key, value]) => {
            out[key] = PlToJs(value as PlStuff, sm);
        });

        // custom js instance format
        return {
            _version: VERSION,
            type: instance.type,
            value: out
        };
    }

    function jsIsInstance(js: object): boolean {
        if ("_version" in js) {
            switch (js["_version"]) {
                case 1:
                    if ("type" in js && typeof js["type"] == "string") {
                        if ("value" in js && typeof js["value"] === 'object' &&  js["value"] !== null) {
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

    function jsToInstance(js: object, sm: StackMachine): PlStuff {
        const out = {};
        for (const [key, value] of Object.entries(js["value"])) {
            out[key] = JsToPl(value, sm);
        }
        return NewPlStuff(PlStuffType.Inst, {
            type: js["type"],
            value: out
        } as PlInstance);
    }

    // plang type to js type
    export function PlToJs(object: PlStuff, sm: StackMachine): any {
        switch (object.type) {
            case PlStuffType.Str: {
                return object.value;
            }
            case PlStuffType.Num: {
                return +object.value;
            }
            case PlStuffType.Type: {
                return object.value.type; // a string
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
                return function(...args) {
                    return PlToJs(object.value.native(...args.map(a => JsToPl(a, sm))), sm);
                };
            }
            case PlStuffType.Func: {
                return (...args) => {
                    return PlToJs(sm.runFunction(object, args.map(arg => JsToPl(arg, sm))), sm);
                };
            }
        }
        throw new Error(`PlConvert.PlToJs failed to match object of type ${PlStuffTypeToString(object.type)}`);
    }

    // js type to plang type
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
                return NewPlStuff(PlStuffType.NFunc, {
                    native: function (...args) {
                        return JsToPl(object.bind(this)(...args.map(a => PlToJs(a, sm))), sm);
                    },
                    name: "native"
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
                    return NewPlStuff(PlStuffType.List, object.map(i => JsToPl(i, sm)));
                }

                if (jsIsInstance(object)) {
                    return jsToInstance(object, sm);
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

    // Plang Type To Plang Type
    export function PlToPl(source: PlStuff, target: string, sm: StackMachine): PlStuff {
        const sourceStr = PlStuffGetType(source);
        const targetStr = target;
        if (sourceStr == targetStr) {
            return source;
        }

        const targetType: PlStuffType = PlStuffTypeFromString(target);
        switch (targetType) {
            case PlStuffType.Dict:
            case PlStuffType.Inst:
            case PlStuffType.Func:
            case PlStuffType.NFunc:
            case PlStuffType.List:
            case PlStuffType.Null:
                return PlStuffNull;

            case PlStuffType.Type:
                // TODO: Write this
                return PlStuffNull;
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
            }
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
                        }
                        break;
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
            }
            case PlStuffType.Str: {
                return NewPlStuff(PlStuffType.Str, PlToString(source, sm));
            }
        }

        return PlStuffNull;
    }

    // to string
    export function PlToString(object: PlStuff, sm: StackMachine, quote: boolean = false): string {
        switch (object.type) {
            case PlStuffType.Bool:
                return object.value ? "true" : "false";
            case PlStuffType.Dict:
                return `dict(${Object.entries(object.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToString(value, sm,true)}`).join(', ')})`;
            case PlStuffType.NFunc:
            case PlStuffType.Func:
                return "[function]";
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
                return PlStuffGetType(object);
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
}

export namespace PlActions {


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

            case PlStuffType.Inst:
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
            case PlStuffType.Inst: {
                const newObj = {};
                Object.entries(value.value).forEach(([k, v]) => {
                    newObj[k] = PlClone(v as PlStuff);
                });
                return NewPlStuff(type, newObj);
            }
            case PlStuffType.Dict: {
                const newObj = {};
                Object.entries(value).forEach(([k, v]) => {
                    newObj[k] = PlClone(v as PlStuff);
                });
                return NewPlStuff(type, newObj);
            }
            case PlStuffType.Type:
            case PlStuffType.Null:
            case PlStuffType.Bool:
            case PlStuffType.NFunc:
                return object;
        }
        throw new Error(`PlActions.PlClone failed to match type ${PlStuffTypeToString(object.type)}`);
    }

    export function PlDefault(type: PlStuffType): PlStuff {
        return null;
    }
}
