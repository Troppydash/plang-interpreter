// converter
import { NewPlStuff, PlStuff, PlStuffNull, PlStuffType } from "./stuff";

export namespace PlConverter {
    export function PlToJs(object: PlStuff): any {
        switch (object.type) {
            case PlStuffType.STRING: {
                return object.value;
            }
        }
        throw "Unimplemented";
    }

    export function JsToPl(object: any): PlStuff {
        switch (typeof object) {
            case "function": {
                return NewPlStuff(PlStuffType.NFUNCTION, {
                    callback: function ( ...args ) {
                        return JsToPl(object(...args.map(a => PlToJs(a))));
                    }
                });
            }
            case "undefined": {
                return PlStuffNull;
            }
            case "object": {
                if (object == null) {
                    return PlStuffNull;
                }
            }
        }
        throw "Unimplemented";
    }
}
