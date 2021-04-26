import { isalphanum } from "./types";

export function replaceForAll( source: string, value: string, newValue: string ): string {
    return source.split( value ).join( newValue );
}

function escapeChar(c) {
    switch ( c ) {
        case '\n': {
            return '\\n';
        }
        case '\r': {
            return '\\r';
        }
        case '\t': {
            return '\\r';
        }
        case '\f': {
            return '\\f';
        }
        default: {
            return c;
        }
    }
}

export function escapeString( source: string ): string {
    return source.split( '' ).map( c => {
        if ( isalphanum( c ) ) {
            return c;
        }
        return escapeChar(c);
    } ).join( '' );
}

// https://stackoverflow.com/questions/1772941/how-can-i-insert-a-character-after-every-n-characters-in-javascript
export function chunkString(str, n) {
    var ret = [];
    var i;
    var len;

    for(i = 0, len = str.length; i < len; i += n) {
        ret.push(str.substr(i, n))
    }

    if (ret.length == 0) {
        ret.push('');
    }

    return ret;
}

export function dddString(source: string, limit: number = 20) {
    if (source.length <= 20) {
        return source;
    }
    return source.substring(0, limit - 3) + '...';
}
