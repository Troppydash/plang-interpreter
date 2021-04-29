import {ScrambleFunction} from "../../scrambler";
import {PlStuffType} from "../../stuff";

export const jsList = {
    [ScrambleFunction( "get", PlStuffType.List )]: (lst, index) => {
        return lst[index-1];
    },
    [ScrambleFunction( "add", PlStuffType.List )]: (lst, value) => {
        lst.push(value);
        return lst;
    },
    [ScrambleFunction( "size", PlStuffType.List )]: (lst) => {
        return lst.length;
    },
}