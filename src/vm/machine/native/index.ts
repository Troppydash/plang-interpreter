import {jsOperators, operators} from "./operators";
import {jsList, list} from "./impl/list";
import {all} from "./impl/all";
import {jsStr, str} from "./impl/str";
import {dict, jsDict} from "./impl/dict";
import {jsSpecial, special} from "./special";
import {ExportJs, ExportNative} from "./types";
import {maths} from "./modules/maths";
import {jsNum} from "./impl/num";
import {time} from "./modules/time";
import {random} from "./modules/random";
import {jsdebug} from "./modules/debug";
import {func} from "./impl/func";


export const jsNatives: ExportJs = {
    ...jsOperators,
    ...jsList,
    ...jsDict,
    ...jsStr,
    ...jsNum,
    ...jsSpecial,
};

export const natives: ExportNative = {
    ...operators,
    ...str,
    ...list,
    ...dict,
    ...func,
    ...all,
    ...special,
};

export const jsModules: Record<string, any> = {
    ...maths,
    ...time,
    ...random,
    ...jsdebug,
};
