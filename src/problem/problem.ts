import {PlFileInfo} from "../compiler/lexing/info";
import templates, {PlProblemCode} from "./codes";
import {escapeString} from "../extension";

export type PlHereType = keyof typeof hereMessage;
const hereMessage = {
    before: "before here",
    here: "here",
    after: "after here",
}

export function HTMessage(hereType: PlHereType) {
    return hereMessage[hereType];
}

export interface PlProblem {
    info: PlFileInfo | null,
    message: string;
    code: PlProblemCode;
    here: PlHereType
}


function replaceArgs(content: string, args: string[]) {
    for (let i = 0; i < args.length; ++i) {
        content = content.replace('%' + i, escapeString(args[i]));
    }
    return content;
}

export function NewPlProblem(code: PlProblemCode, fileInfo: PlFileInfo, ...args: string[]): PlProblem {
    return {
        info: fileInfo,
        message: replaceArgs(templates[code], args),
        code,
        here: "here"
    };
}

export function NewPlProblemAt(code: PlProblemCode, fileInfo: PlFileInfo |null, here: PlHereType = "here", ...args: string[]): PlProblem {
    return {
        info: fileInfo,
        message: replaceArgs(templates[code], args),
        code,
        here
    }
}
