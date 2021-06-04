import {GenerateJsGuardedFunction} from "../helpers";

function generateBindings(target: any, converter: Record<string, string>): object {
    const out = {};
    for (const [key, entry] of Object.entries(converter)) {
        if (typeof target[entry] == "function") {
            out[key] = GenerateJsGuardedFunction(key, ["number"], target[entry]);
        } else {
            out[key] = target[entry];
        }
    }
    return out;
}


export const maths = {
    maths: generateBindings(Math, {
        sin: "sin",
        cos: "cos",
        tan: "tan",
        log2: "log2",
        ln: "log",
        exp: "exp",
        pi: "PI",
        e: "E",
    })
};
