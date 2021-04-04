// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color

import { isNode } from "./index";

const COLORS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export let colors;
if (isNode) {
    colors = (function (colors) {
        const fn = (code: number, str: string) => `\x1b[${code}m${str}\x1b[39m`;
        const obj = { grey: fn.bind(null, 90) };
        for (let i = 0; i < colors.length; i++) obj[colors[i]] = fn.bind(null, 30 + i);
        return obj as { [K in typeof colors[any] | 'grey']: (str: string) => string };
    })(COLORS);
} else {
    const nothing = str => str;
    colors = {
        'grey': nothing
    };
    for (const color of COLORS) {
        colors[color] = nothing;
    }
}

