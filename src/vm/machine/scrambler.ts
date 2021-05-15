import { METHOD_SEP } from "../emitter";
import { PlStuff, PlStuffGetType, PlStuffType, PlStuffTypeToString } from "./stuff";

export function ScrambleType( name: string, impl?: PlStuffType): string {
    return `${impl != undefined ? PlStuffTypeToString(impl)+METHOD_SEP : ''}${name}`;
}

export function ScrambleImpl(name: string, impl: PlStuff) {
    return `${PlStuffGetType(impl)}${METHOD_SEP}${name}`;
}

export function ScrambleName(name: string, type: string) {
    return `${type}${METHOD_SEP}${name}`;
}

export function UnscrambleFunction(scrambled: string) {
    if (scrambled.includes('@')) {
        return scrambled.split('@');
    }
    return ['', scrambled];
}
