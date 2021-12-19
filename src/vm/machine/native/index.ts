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
import {debug} from "./modules/debug";
import {func} from "./impl/func";
import {system} from "./modules/system";
import {isNode} from "../../../inout";
import {color} from "./modules/color";


export const jsNatives: ExportJs = {
    ...jsOperators,
    ...jsDict,
    ...jsList,
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
    maths,
    time,
    random,
    color
};

export const modules = {
    debug,
}

if (isNode) {
    (jsModules as any).system = system;
}
