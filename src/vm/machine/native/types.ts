import {PlStuff} from "../stuff";

export type NativeFunction = (...args: PlStuff[]) => PlStuff;
export type JsFunction = (...args: any[]) => any;


export type ExportNative = Record<string, NativeFunction>;
export type ExportJs = Record<string, JsFunction>;
