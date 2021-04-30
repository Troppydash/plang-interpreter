import { PlStuff, PlStuffType } from "../stuff";
import { jsOperators, operators } from "./operators";
import { jsList, list } from "./impl/list";
import { all } from "./impl/all";
import { jsStr, str } from "./impl/str";
import { ScrambleFunction } from "../scrambler";
import { assertType, assertTypeof } from "./helpers";
import { PlConverter } from "./converter";


export const jsNatives: Record<string, any> = {
    ...jsOperators,
    ...jsList,
    ...jsStr,
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

function maskedEval( src, ctx = {} ) {
    ctx = new Proxy( ctx, {
        has: () => true
    } )
    let func = (new Function( "with(this) { " + src + "}" ));
    func.call( ctx );
}

export const natives: Record<string, PlStuff> = {
    ...operators,
    ...str,
    ...list,
    ...all
};
