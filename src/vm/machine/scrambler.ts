import { ARITY_SEP, METHOD_SEP } from "../emitter";
import { PlStuffToTypeString, PlStuffType } from "./stuff";

export function ScrambleFunction(name: string, arity: number, impl?: PlStuffType): string {
    return `${impl ? PlStuffToTypeString(impl)+METHOD_SEP : ''}${name}${ARITY_SEP}${arity}`
}
