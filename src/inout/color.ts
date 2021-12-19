import { isNode } from "./index";

export const COLORS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
export type PlColors = (typeof COLORS[number]) | 'grey';

export let colors;
if (isNode) {
    SetColorNode();
} else {
    SetColorHTML();
}

export function SetColorNode() {
    // https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
    colors = (function (colors) {
        const fn = (code: number, str: string) => `\x1b[${code}m${str}\x1b[39m`;
        const obj = { grey: fn.bind(null, 90) };
        for (let i = 0; i < colors.length; i++) obj[colors[i]] = fn.bind(null, 30 + i);
        return obj as { [K in typeof colors[any] | 'grey']: (str: string) => string };
    })(COLORS);
}

export function SetColorHTML() {
    colors = {};
    for (const color of [...COLORS, 'grey']) {
        colors[color] = (str) => `<span\\style='color:${color}'>${str}</span>`;
    }
}


export function SetColorNone() {
    colors = {};
    for (const color of [...COLORS, 'grey']) {
        colors[color] = str => str;
    }
}
