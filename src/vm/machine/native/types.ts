import {PlStuff} from "../stuff";

export type NativeFunction = (...args: PlStuff[]) => PlStuff;
export type JsFunction = Function;