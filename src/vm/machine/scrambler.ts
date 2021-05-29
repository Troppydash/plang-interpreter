import { METHOD_SEP } from "../emitter";
import { PlStuff, PlStuffGetType, PlStuffType, PlStuffTypeToString } from "./stuff";

/**
 * Scramble a name with a plstufftype
 * @param name The name
 * @param impl The type
 * @constructor
 */
export function ScrambleType( name: string, impl?: PlStuffType): string {
    return `${impl != undefined ? PlStuffTypeToString(impl)+METHOD_SEP : ''}${name}`;
}

/**
 * Scramble a name for an impl call
 * @param name The name
 * @param impl The impl target
 * @constructor
 */
export function ScrambleImpl(name: string, impl: PlStuff) {
    return `${PlStuffGetType(impl)}${METHOD_SEP}${name}`;
}

/**
 * Scramble a name with a string type
 * @param name The name
 * @param type The string type
 * @constructor
 */
export function ScrambleName(name: string, type: string) {
    return `${type}${METHOD_SEP}${name}`;
}

/**
 * Unscramble a name, returns [type, name]
 * @param scrambled The scrambled name
 * @constructor
 */
export function UnscrambleFunction(scrambled: string): [string, string] {
    if (scrambled.includes('@')) {
        const out = scrambled.split('@');
        if (out.length != 2) {
            throw new Error(`UnscrambleFunction unscrambled a name that contains more than two @, scrambled: '${scrambled}'`);
        }
    }
    return ['', scrambled];
}
