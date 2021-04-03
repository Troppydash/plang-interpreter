export const isNode =
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;


interface Inout {
    print: (message: string) => void;
    input: (message: string) => string | null;
}

let inout: Inout;
if ( isNode ) {
    inout = require("./nodeInout");
} else {
    inout = require('./otherInout');
}

export default inout;
