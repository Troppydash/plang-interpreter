import {PlStuff} from "../stuff";

type NativeFunction = (...args: PlStuff[]) => PlStuff;
type JsFunction = (...args: any[]) => any;

export type ExportNative = Record<string, NativeFunction>;
export type ExportJs = Record<string, JsFunction>;
