import { ScrambleFunction } from "../scrambler";
import { PlStuffType } from "../stuff";

export const natives = {
    [ScrambleFunction( "+",  PlStuffType.NUMBER )]: (l, r) => l + r,
    [ScrambleFunction( "-",  PlStuffType.NUMBER )]: (l, r) => l - r,
    [ScrambleFunction( "*",  PlStuffType.NUMBER )]: (l, r) => l * r,
    [ScrambleFunction( "/",  PlStuffType.NUMBER )]: (l, r) => l / r,

    [ScrambleFunction( "+", PlStuffType.STRING )]: (l, r) => l + r,
    [ScrambleFunction( "*", PlStuffType.STRING )]: (l, r) => l.repeat(r),
}
