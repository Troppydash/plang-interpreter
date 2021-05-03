import { jsOperators, operators } from "./operators";
import { jsList, list } from "./impl/list";
import { all } from "./impl/all";
import { jsStr, str } from "./impl/str";
import {dict} from "./impl/dict";
import {jsSpecial, special} from "./special";
import {JsFunction, NativeFunction} from "./types";


export const jsNatives: Record<string, JsFunction> = {
    ...jsOperators,
    ...jsList,
    ...jsStr,
    ...jsSpecial,
};

export const natives: Record<string, NativeFunction> = {
    ...operators,
    ...str,
    ...list,
    ...dict,
    ...all,
    ...special,
};
