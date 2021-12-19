import {GenerateGuardedFunction} from "../helpers";
import {colors, COLORS} from "../../../../inout/color";
import {PlStuffType} from "../../stuff";

export let color = {};

for (const c of [...COLORS, 'grey']) {
    color[c] = GenerateGuardedFunction(c, [PlStuffType.Str], function (str) {
        return colors[c](str);
    });
}


