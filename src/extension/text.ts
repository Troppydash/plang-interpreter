import {isalphanum, isws} from "./types";
/**
 * Replace all **value** in the string with **newValue**
 * @param source The source string
 * @param value The value to replace
 * @param newValue The value to replace with
 */
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

/**
 * Escape a piece of string of special characters
 * @param source The source string to escape
 */
export function escapeString( source: string ): string {
    return source.split( '' ).map( c => {
        if ( isalphanum( c ) ) {
            return c;
        }
        return escapeChar(c);
    } ).join( '' );
}

/**
 * Split the string into chunks of n length
 * @param str The string to split
 * @param n The chunk size
 */
export function chunkString(str, n) {
    // https://stackoverflow.com/questions/1772941/how-can-i-insert-a-character-after-every-n-characters-in-javascript
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

/**
 * Adds ... to a string if it is too long
 * @param source The source string
 * @param limit The maximum length with the ...
 */
export function dddString(source: string, limit: number = 20) {
    if (source.length <= limit) {
        return source;
    }
    return source.substring(0, limit - 3) + '...';
}

/**
 * Wraps a line where each line have a max of *w* characters
 * @param s The source string
 * @param w The character limit
 */
export function lineWrap(s: string, w: number): string {
    // https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
   return s.replace(
       new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
   );
}

export function shallowJSON(object: any): string {
    // https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
    return JSON.stringify(object, function (k, v) {
        return k && v && typeof v !== "number" ? (Array.isArray(v) ? `[array ${v.length}]` : "" + v) : v;
    }, 2);
}

export function capitalize(str: string): string {
    return str[0].toUpperCase() + str.slice(1);
}




export function sliceColoredString(text: string, start: number): string {
    // const stringLength = syncPromise(import('string-length'));
    const stringLength = null;

    let startIndex = 0;
    for (let i = 0; i < text.length; ++i) {
        if (stringLength(text.slice(0, i)) === start + 1) {
            startIndex = i - 1;
            break;
        }
    }

    // else throw

    return text.slice(startIndex);

}

//https://stackoverflow.com/a/43760745/9341734
export function removeByIndex(str,index) {
    return str.slice(0,index) + str.slice(index+1);
}
