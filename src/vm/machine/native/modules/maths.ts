function generateBindings(target: any, converter: Record<string, string>): object {
    const out = {};
    for (const [key, entry] of Object.entries(converter)) {
        out[key] = target[entry];
    }
    return out;
}


export const maths = {
    maths: generateBindings(Math, {
        sin: "sin",
        cos: "cos",
        tan: "tan",
        pi: "PI",
        e: "E",
    })
};