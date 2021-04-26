import { ScrambleFunction } from "../scrambler";
import { PlStuffType } from "../stuff";

function assertType( value: any, type: string, message: string ) {
    if ( typeof value != type ) {
        throw message;
    }
}

function assertEqual( closure: Function ) {
    return ( l, r ) => {
        if ( typeof l != typeof r ) {
            throw "the types on each side of the operator are not the same";
        }
        return closure( l, r );
    }
}

function generateCompare( type: PlStuffType, eq: Function | null = null, gt: Function | null = null ) {
    let out = {};
    if ( eq != null ) {
        out = {
            ...out,
            [ScrambleFunction( "==", type )]: eq,
            [ScrambleFunction( "/=", type )]: ( l, r ) => !eq( l, r ),
        };
    }
    if ( gt != null ) {
        out = {
            ...out,
            [ScrambleFunction( ">", type )]: gt,
            [ScrambleFunction( "<=", type )]: ( l, r ) => !gt( l, r ),
        };
    }
    if ( eq != null && gt != null ) {
        out = {
            ...out,
            [ScrambleFunction( "<", type )]: ( l, r ) => !eq( l, r ) && !gt( l, r ),
            [ScrambleFunction( ">=", type )]: ( l, r ) => eq( l, r ) || gt( l, r ),
        };
    }
    return out;
}


const operators = {
    // numbers
    [ScrambleFunction( "+", PlStuffType.NUMBER )]: assertEqual( ( l, r ) => l + r ),
    [ScrambleFunction( "-", PlStuffType.NUMBER )]: assertEqual( ( l, r ) => l - r ),
    [ScrambleFunction( "*", PlStuffType.NUMBER )]: assertEqual( ( l, r ) => l * r ),
    [ScrambleFunction( "/", PlStuffType.NUMBER )]: assertEqual( ( l, r ) => l / r ),
    ...generateCompare( PlStuffType.NUMBER, ( l, r ) => l === r, ( l, r ) => l > r ),

    // strings
    [ScrambleFunction( "+", PlStuffType.STRING )]: assertEqual( ( l, r ) => l + r ),
    [ScrambleFunction( "*", PlStuffType.STRING )]: ( l, r ) => {
        assertType( r, "number", "string can only multiply with numbers" );
        return l.repeat( r );
    },
    ...generateCompare( PlStuffType.STRING, ( l, r ) => l === r ),

    // booleans
    ...generateCompare( PlStuffType.BOOLEAN, ( l, r ) => l === r ),

    // null
    ...generateCompare( PlStuffType.NULL, ( l, r ) => l === r ),

    // type
    ...generateCompare( PlStuffType.TYPE, ( l, r ) => l === r ),

    // list
    ...generateCompare( PlStuffType.LIST, ( l, r ) => l === r ),

    // dict
    ...generateCompare( PlStuffType.DICTIONARY, ( l, r ) => l === r ),

    // func
    ...generateCompare( PlStuffType.FUNCTION, ( l, r ) => l === r ),
};

// list
export const list = {
    [ScrambleFunction( "get", PlStuffType.LIST )]: (lst, index) => {
        return lst[index-1];
    },
    [ScrambleFunction( "add", PlStuffType.LIST )]: (lst, value) => {
        lst.push(value);
        return lst;
    },
    [ScrambleFunction( "size", PlStuffType.LIST )]: (lst) => {
        return lst.length;
    },
}


export const natives = {
    ...operators,
    ...list,
};
