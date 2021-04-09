import {PlFileInfo} from "../compiler/lexing/info";
import templates, {PlProblemCode} from "./codes";
import {escapeString} from "../extension";

export type PlHereType = keyof typeof hereMessage;
const hereMessage = {
    before: "",
    here: "",
    after: "",
}

export interface PlProblem {
    fileInfo: PlFileInfo,
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
        fileInfo,
        message: replaceArgs(templates[code], args),
        code,
        here: "here"
    };
}

export function NewPlProblemAt(code: PlProblemCode, fileInfo: PlFileInfo, here: PlHereType = "here", ...args: string[]): PlProblem {
    return {
        fileInfo,
        message: replaceArgs(templates[code], args),
        code,
        here
    }
}
