import { jsOperators, operators } from "./operators";
import { jsList, list } from "./impl/list";
import { all } from "./impl/all";
import { jsStr, str } from "./impl/str";
import {dict, jsDict} from "./impl/dict";
import {jsSpecial, special} from "./special";
import {JsFunction, NativeFunction} from "./types";
import {maths} from "./modules/maths";
import {jsNum} from "./impl/num";


export const jsNatives: Record<string, JsFunction> = {
    ...jsOperators,
    ...jsList,
    ...jsDict,
    ...jsStr,
    ...jsNum,
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

export const jsModules: Record<string, any> = {
    ...maths
};
