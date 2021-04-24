import { ScrambleFunction } from "../scrambler";
import { PlStuffType } from "../stuff";

function addition(left: any, right: any) {
    return left + right;
}

function subtraction(left: any, right: any) {
    return left - right;
}

export const natives = {
    [ScrambleFunction( "+", 1, PlStuffType.NUMBER )]: left => left,
    [ScrambleFunction( "-", 1, PlStuffType.NUMBER )]: left => -left,
    [ScrambleFunction( "-", 2, PlStuffType.NUMBER )]: subtraction,

    [ScrambleFunction( "+", 2, PlStuffType.STRING )]: addition,
    [ScrambleFunction( "+", 2, PlStuffType.STRING )]: addition,
    [ScrambleFunction( "*", 2, PlStuffType.STRING )]: (left, right) => left.repeat(right),
}
