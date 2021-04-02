export const isNode =
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;


interface Inout {
    print: (message: string) => void;
    input: (message: string) => string | null;
}

let module: Inout;
if ( isNode ) {
    module = require("./nodeInout");
} else {
    module = require('./otherInout');
}

export default module;
