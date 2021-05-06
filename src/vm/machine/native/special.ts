import {ScrambleFunction} from "../scrambler";
import {PlActions, PlConverter} from "./converter";
import {NewPlStuff, PlStuff, PlStuffNull, PlStuffType} from "../stuff";
import {assertType, assertTypeof, expectedNArguments} from "./helpers";
import PlToString = PlActions.PlToString;
import {StackMachine} from "../index"; // Hopefully this doesn't cause a circular dependency problem

export const jsSpecial = {
    [ScrambleFunction( "range" )]: function ( start, end, step ) {
        if ( start != undefined )
            assertTypeof( start, "number", "range start needs to be a number" );
        if ( end != undefined )
            assertTypeof( end, "number", "range end needs to be a number" );
        if ( step != undefined )
            assertTypeof( step, "number", "range step needs to be a number" );

        if ( arguments.length > 3 ) {
            throw new Error( "range can only take a maximum of three arguments, start end step" );
        }

        if ( arguments.length == 2 ) {
            step = 1;
        }

        if ( arguments.length == 1 ) {
            end = start;
            start = step = 1;
        }

        let current = start;
        return {
            iter: () => {
                return {
                    next: () => {
                        if ( current > end ) {
                            return [ [ null, null ], false ];
                        }
                        const out = [ [ current, current ], true ];
                        current += step;
                        return out;
                    }
                }
            }
        }
    },
};

export const special = {
    [ScrambleFunction("say")]: function (this: StackMachine, ...message: any) {
        if (message.length == 0) {
            this.inout.print('\n');
        } else {
            this.inout.print(message.map(m => PlActions.PlToString(m)).join(' '));
        }
        return PlStuffNull;
    },
    [ScrambleFunction("ask")]: function (this: StackMachine, ...message: any) {
        const str = this.inout.input(message.map(m => PlActions.PlToString(m)).join('\n'));
        if (str == null) {
            return PlStuffNull;
        }
        return NewPlStuff(PlStuffType.Str, str);
    },
    [ScrambleFunction("javascript")]: function (this: StackMachine, ...args: PlStuff[]) {
        expectedNArguments(1, args as unknown as IArguments, false);
        const code = args[0];
        assertType(code, PlStuffType.Str, "'javascript' need strings as parameters");

        try {
            this.inout.execute(code.value, {
                pl: {
                    import: (key) => {
                        return PlConverter.PlToJs(this.findValue(key), this.runFunction.bind(this));
                    },
                    export: (key, value) => {
                        this.createValue(key, PlConverter.JsToPl(value, this.runFunction));
                        return null;
                    }
                }
            })
        } catch (e) {
            throw new Error(`from Javascript - [${e.name}] ${e.message}`);
        }
    },

    [ScrambleFunction("panic")]: (...message: PlStuff[]) => {
        throw new Error(message.map(m => PlToString(m)).join(' '));
    },
}
