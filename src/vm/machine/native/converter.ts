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
import { PlInstance, PlType } from "../memory";

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
                return object.value.type; // a string
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
            case PlStuffType.Inst: {
                const out = {};
                Object.entries(object.value.value).forEach(([key, value]) => {
                    out[key] = PlToJs(value as PlStuff, runFunction);
                });
                return out;
            }
            case PlStuffType.Dict: {
                const out = {};
                Object.entries(object.value).forEach(([key, value]) => {
                    out[key] = PlToJs(value as PlStuff, runFunction);
                });
                return out;
            }
            case PlStuffType.NFunc: {
                return function(...args) {
                    return PlToJs(object.value.native(...args.map(a => JsToPl(a, runFunction))), runFunction);
                };
            }
            case PlStuffType.Func: {
                return (...args) => {
                    return PlToJs(runFunction(object, ...args.map(arg => JsToPl(arg, runFunction))), runFunction);
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
                    native: function (...args) {
                        return JsToPl(object.bind(this)(...args.map(a => PlToJs(a, runFunction))), runFunction);
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

    // Plang Type To Plang Type
    export function PlToPl(source: PlStuff, target: string): PlStuff {
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
                return NewPlStuff(PlStuffType.Str, PlActions.PlToString(source));
            }
        }

        return PlStuffNull;
    }
}

export namespace PlActions {
    // to string
    export function PlToString(object: PlStuff, quote: boolean = false): string {
        switch (object.type) {
            case PlStuffType.Bool:
                return object.value ? "true" : "false";
            case PlStuffType.Dict:
                return `dict(${Object.entries(object.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToString(value, true)}`).join(', ')})`;
            case PlStuffType.NFunc:
            case PlStuffType.Func:
                return "[function]";
            case PlStuffType.List:
                return `list(${object.value.map(v => PlToString(v, true)).join(', ')})`;
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
            case PlStuffType.Inst:
                return `${(object.value as PlInstance).type}(${Object.entries(object.value.value).map(([key, value]: [string, PlStuff]) => `${key}: ${PlToString(value, true)}`).join(', ')})`
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
