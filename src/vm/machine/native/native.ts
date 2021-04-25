import { ScrambleFunction } from "../scrambler";
import { PlStuffType } from "../stuff";

function assertType( value: any, type: string, message: string ) {
    if ( typeof value != type ) {
        throw message;
    }
}

export const natives = {
    [ScrambleFunction( "+", PlStuffType.NUMBER )]: ( l, r ) => l + r,
    [ScrambleFunction( "-", PlStuffType.NUMBER )]: ( l, r ) => l - r,
    [ScrambleFunction( "*", PlStuffType.NUMBER )]: ( l, r ) => l * r,
    [ScrambleFunction( "/", PlStuffType.NUMBER )]: ( l, r ) => l / r,
    [ScrambleFunction( "==", PlStuffType.NUMBER )]: ( l, r ) => l == r,
    [ScrambleFunction( "/=", PlStuffType.NUMBER )]: ( l, r ) => l != r,
    [ScrambleFunction( ">", PlStuffType.NUMBER )]: ( l, r ) => l > r,
    [ScrambleFunction( "<", PlStuffType.NUMBER )]: ( l, r ) => l < r,
    [ScrambleFunction( ">=", PlStuffType.NUMBER )]: ( l, r ) => l >= r,
    [ScrambleFunction( "<=", PlStuffType.NUMBER )]: ( l, r ) => l <= r,

    [ScrambleFunction( "+", PlStuffType.STRING )]: ( l, r ) => l + r,
    [ScrambleFunction( "*", PlStuffType.STRING )]: ( l, r ) => {
        assertType( r, "number", "string can only multiply with numbers" );
        return l.repeat( r );
    },
    [ScrambleFunction( "==", PlStuffType.STRING )]: ( l, r ) => l == r,

}
