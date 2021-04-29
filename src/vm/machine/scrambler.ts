import { METHOD_SEP } from "../emitter";
import { PlStuffTypeToString, PlStuffType } from "./stuff";

export function ScrambleFunction(name: string, impl?: PlStuffType): string {
    return `${impl != undefined ? PlStuffTypeToString(impl)+METHOD_SEP : ''}${name}`;
}
