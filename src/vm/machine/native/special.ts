import { PlActions, PlConverter } from "./converter";
import { NewPlStuff, PlStuff, PlStuffNull, PlStuffType } from "../stuff";
import { AssertTypeof, GenerateGuardedFunction, GenerateJsGuardedFunction } from "./helpers";
import { StackMachine } from "../index"; // Hopefully this doesn't cause a circular dependency problem
import { MakeNoTypeFunctionMessage } from "./messeger";
import PlToString = PlConverter.PlToString;
import { isNode } from "../../../inout";

export const jsSpecial = {
    "range": function ( start, end, step ) {
        if ( start != undefined )
            AssertTypeof( "range", start, "number", 1 );
        if ( end != undefined )
            AssertTypeof( "range", end, "number", 2 );
        if ( step != undefined )
            AssertTypeof( "range", step, "number", 3 );

        if ( arguments.length > 3 ) {
            throw new Error( "'range' can only take a maximum of three arguments - start, end, step" );
        }

        if ( arguments.length == 2 ) {
            step = 1;
        }

        if ( arguments.length == 1 ) {
            end = start;
            start = step = 1;
        }

        let forward = true;
        if ( step < 0 ) {
            forward = false;
        }

        let current = start;
        return {
            iter: () => {
                return {
                    next: () => {
                        if ( forward ? current > end : current < end ) {
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

    "try": GenerateJsGuardedFunction( "try", [ "function", "function" ], function ( this: StackMachine, attempt, error ) {
        const saved = this.saveState();
        try {
            return attempt();
        } catch ( e ) {
            this.restoreState( saved );
            return error( this.problems.pop() );
        }
    } ),

};

export const special = {
    "eval": GenerateGuardedFunction( "eval", [ "*" ], function ( this: StackMachine, target: PlStuff ) {
        let iter = null; // TODO: maybe make all iterator based
        if ( target.type == PlStuffType.Dict
            && "iter" in target.value
            && (target.value.iter.type == PlStuffType.Func
                || target.value.iter.type == PlStuffType.NFunc) ) {
            iter = target.value.iter;
        } else {
            iter = this.findFunction( "iter", target );
        }
        if ( iter == null ) {
            throw new Error( MakeNoTypeFunctionMessage( "eval", "iter", target ) );
        }

        // trust that the iterator is correct
        let iterator = this.runFunction( iter, [ target ] );
        const next = iterator.value.next;

        let out = [];
        let result;
        while ( (result = this.runFunction( next, [] )).value[1].value == true ) {
            out.push( result.value[0].value[0] );
        }

        return NewPlStuff( PlStuffType.List, out );
    } ),
    "ask": function ( this: StackMachine, ...message: any ) {
        const str = this.inout.input( message.map( m => PlToString( m, this ) ).join( '\n' ) );
        if ( str == null ) {
            return PlStuffNull;
        }
        return NewPlStuff( PlStuffType.Str, str );
    },
    "javascript": GenerateGuardedFunction( "javascript", [ PlStuffType.Str ], function ( this: StackMachine, code: PlStuff ) {
        const _import = (function ( key ) {
            const value = this.findValue( key );
            if ( value == null ) {
                return null;
            }
            return PlConverter.PlToJs( this.findValue( key ), this.runFunction.bind( this ) );
        }).bind( this );
        const _export = (function ( key, value ) {
            this.createValue( key, PlConverter.JsToPl( value, this.runFunction.bind( this ) ) );
            return null;
        }).bind( this );

        try {
            this.inout.execute( code.value, {
                pl: {
                    import: _import,
                    export: _export
                }
            } )
        } catch ( e ) {
            if ( e == null ) {
                throw null;
            }
            throw new Error( `[Javascript ${e.name}] ${e.message}` );
        }
    } ),
    "panic": function ( ...message: PlStuff[] ) {
        throw new Error( message.map( m => PlToString( m, this ) ).join( ' ' ) );
    },
    "locals": GenerateGuardedFunction( "locals", [], function ( this: StackMachine ) {
        const obj = this.stackFrame.values;
        return NewPlStuff( PlStuffType.Dict, obj );
    } ),
    "say": function ( this: StackMachine, ...message: PlStuff[] ) {
        if ( message.length == 0 ) {
            this.inout.print( '\n' );
        } else {
            const combined = message.map( mess => PlToString( mess, this ) ).join( ' ' );
            this.inout.print( combined );
        }
        return PlStuffNull;
    },
};

interface FetchOptions {
    method: string;
    headers: Record<string, string>;
    body: string;
}

interface FetchOutput {
    text: string;
    ok: boolean;
    status: number;
}

function sanitizeOptions(options: object): FetchOptions {
    const method = 'method' in options ? options["method"] : 'GET';
    const headers = 'headers' in options ? options["headers"] : {};
    const body = 'body' in options ? options["body"] : null;
    return {
        method,
        headers,
        body
    };
}

function callbackFetch( fetch ) {
    return function ( url, options, callback ) {
        let d;
        fetch( url, options )
            .then( data => {
                d = data;
                return data.text();
            } )
            .then( text => {
                callback( null, {
                    text,
                    ok: d.ok,
                    status: d.status,
                } as FetchOutput );
            } )
            .catch( err => {
                callback( null, {
                    text: err.message,
                    ok: false,
                    status: err.status ? err.status : '404'
                } as FetchOutput );
            } );
    }
}
if ( isNode ) {
    const deasync = require( 'deasync' );
    const fetch = require( 'node-fetch' );
    const syncFetch = deasync( callbackFetch( fetch ) );

    jsSpecial['fetch'] = GenerateJsGuardedFunction( 'fetch', [ "string", "object" ], function ( this, url, options ) {
        const opt = sanitizeOptions(options);
        return syncFetch( url, opt );
    } );
} else {
    jsSpecial['fetch'] = GenerateJsGuardedFunction( 'fetch', [ "string", "object" ], function ( this, url, options: FetchOptions ) {
        const opt = sanitizeOptions(options);

        const request = new XMLHttpRequest();
        request.open(opt.method, url, false);

        for (const [key, value] of Object.entries(opt.headers)) {
            request.setRequestHeader(key, value);
        }
        request.send(opt.body);

        return {
            ok: Math.floor(request.status / 100) === 2,
            status: request.status,
            text: request.responseText
        } as FetchOutput;
    } );
}
