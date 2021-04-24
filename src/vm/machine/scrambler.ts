import { METHOD_SEP } from "../emitter";
import { PlStuffToTypeString, PlStuffType } from "./stuff";

export function ScrambleFunction(name: string, impl?: PlStuffType): string {
    return `${impl != undefined ? PlStuffToTypeString(impl)+METHOD_SEP : ''}${name}`;
}
