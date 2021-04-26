// converter
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType } from "../stuff";
import { PlFunction, PlNativeFunction } from "../memory";

export namespace PlConverter {
    export function PlToJs( object: PlStuff ): any {
        switch ( object.type ) {
            case PlStuffType.STRING: {
                return object.value;
            }
            case PlStuffType.NUMBER: {
                return +object.value;
            }
            case PlStuffType.TYPE: {
                return object.value;
            }
            case PlStuffType.BOOLEAN: {
                return object.value;
            }
            case PlStuffType.NULL: {
                return null;
            }
            case PlStuffType.LIST: {
                return object.value.map( v => PlToJs( v ) );
            }
            case PlStuffType.DICTIONARY: {
                const out = {};
                Object.entries( object.value ).forEach( ( [ key, value ] ) => {
                    out[key] = PlToJs( value as PlStuff );
                } );
                return out;
            }
            case PlStuffType.NFUNCTION: {
                const value = object.value as PlNativeFunction;
                return value.native;
            }
            case PlStuffType.FUNCTION: {
                const value = object.value as PlFunction;
                // TODO: think of how to do this
                return "[function]";
            }
        }
        throw "Unimplemented convert from pltojs";
    }

    export function JsToPl( object: any ): PlStuff {
        switch ( typeof object ) {
            case "number": {
                return NewPlStuff( PlStuffType.NUMBER, object );
            }
            case "string": {
                return NewPlStuff( PlStuffType.STRING, object );
            }
            case "boolean": {
                if ( object ) {
                    return PlStuffTrue;
                }
                return PlStuffFalse;
            }
            case "function": {
                return NewPlStuff( PlStuffType.NFUNCTION, {
                    callback: function ( ...args ) {
                        return JsToPl( object( ...args.map( a => PlToJs( a ) ) ) );
                    },
                    native: object
                } );
            }

            case "undefined": {
                return PlStuffNull;
            }
            case "object": {
                if ( object == null ) {
                    return PlStuffNull;
                }
                if (object.length) {
                    return NewPlStuff(PlStuffType.LIST, object.map(i => JsToPl(i)));
                }
            }
        }
        throw "Unimplemented from jstopl";
    }
}
