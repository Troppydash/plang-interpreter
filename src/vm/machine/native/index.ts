import {PlStuff} from "../stuff";
import {jsOperators, operators} from "./operators";
import {jsList} from "./impl/list";
import {all} from "./impl/all";
import {jsStr} from "./impl/str";


export const jsNatives: Record<string, any> = {
    ...jsOperators,
    ...jsList,
    ...jsStr,
};



export const natives: Record<string, PlStuff> = {
    ...operators,
    ...all,
};