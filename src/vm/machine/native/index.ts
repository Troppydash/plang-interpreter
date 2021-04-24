// converter
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType } from "../stuff";

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
        }
        throw "Unimplemented";
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
                if (object) {
                    return PlStuffTrue;
                }
                return PlStuffFalse;
            }

            case "function": {
                return NewPlStuff( PlStuffType.NFUNCTION, {
                    callback: function ( ...args ) {
                        return JsToPl( object( ...args.map( a => PlToJs( a ) ) ) );
                    }
                } );
            }

            case "undefined": {
                return PlStuffNull;
            }
            case "object": {
                if ( object == null ) {
                    return PlStuffNull;
                }
            }
        }
        throw "Unimplemented";
    }
}
