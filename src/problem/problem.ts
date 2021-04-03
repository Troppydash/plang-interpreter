import { PlFileInfo } from "../compiler/lexing/info";
import templates, { PlProblemCode } from "./codes";

export interface PlProblem {
    fileInfo: PlFileInfo,
    message: string;
    code: PlProblemCode;
}


function replaceArgs( content: string, args: string[] ) {
    for ( let i = 0; i < args.length; ++i ) {
        content = content.replace( '%' + i, args[i] );
    }
    return content;
}

export function NewPlProblem(  code: PlProblemCode,fileInfo: PlFileInfo, ...args: string[] ) {
    return {
        fileInfo,
        message: replaceArgs( templates[code], args ),
        code
    };
}
