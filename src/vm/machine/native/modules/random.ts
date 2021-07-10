import {AssertTypeof, GenerateGuardedFunction} from "../helpers";
import {PlStuffType, PlStuffTypeRest} from "../../stuff";

function randomNumber(lower, upper) {
    if (lower != null) {
        AssertTypeof("number", lower, "number", 1);
    }
    if (upper != null) {
        AssertTypeof("number", upper, "number", 2);
    }

    if (lower == null && upper == null) {
        lower = 1;
        upper = 100;
    } else if (upper == null) {
        upper = lower;
        lower = 1;
    } else if (lower == null) {
        lower = 1;
    }

    return Math.floor(Math.random() * (upper - lower + 1) + lower);
}

export const random = {
        number: GenerateGuardedFunction("number", [PlStuffTypeRest], randomNumber),
        list: GenerateGuardedFunction("list", [PlStuffType.Num, PlStuffType.Num, PlStuffType.Num], function (lower, upper, n) {
            let out = [];
            for (let i = 0; i < n; i++) {
                out.push(randomNumber(lower, upper));
            }
            return out;
        })
};
