import {HTMessage, PlHereType, PlProblem} from "./problem";
import {PCFullName, PCHint, PlProblemCode} from "./codes";
import inout from "../inout";
import {colors} from "../inout/color";
import {chunkString} from "../extension";
import {PlTrace, PlTraceFrame} from "./trace";
import {PlFileInfo} from "../compiler/lexing/info";

const NLINESUP = 1;
const NLINESDOWN = 2;
const CHARWRAP = 80;
export const TRACE_MAX = 3;


function wrapLine(line: string, header: string) {
    return line.split('\n').map(l => chunkString(l, CHARWRAP).join('\n' + header)).join('\n' + header); // TODO: make this prettier
}

type Line = string[];

function getLine(lines: string[], targetRow: number): Line | null {
    if (targetRow >= 0 && targetRow < lines.length) {
        const line = lines[targetRow];
        return chunkString(line, CHARWRAP);
    }
    return null;
}

// find one line up, two lines down
function getLines(lines: string[], targetRow: number): [Line[], Line, Line[]] {
    let linesUp = [];
    let linesDown = [];

    for (let i = 0; i < NLINESUP; ++i) {
        linesUp.push(getLine(lines, targetRow - i - 1));
    }

    for (let i = 0; i < NLINESDOWN; ++i) {
        linesDown.push(getLine(lines, targetRow + i + 1));
    }

    return [
        linesUp,
        getLine(lines, targetRow),
        linesDown,
    ];
}

export function CreateProblemTitle(code: string, info: PlFileInfo) {
    const buffer = [];
    if (info == null) {
        buffer.push(`[${code}] There is no debug information`);
    } else {
        buffer.push(`[${code}] In "${info.filename}" on line ${info.row + 1}`);
    }
    return buffer;
}

export function CreateProblemBody(here: PlHereType, info: PlFileInfo, content: string, grey: Function = colors.grey) {
    const buffer = [];
    const actualCol = info.col - info.length;
    const largestLineNumberLength = (info.row + NLINESDOWN).toString().length;

    // lines and stuff
    const contentLines = content.split('\n');
    const [linesUp, targetLine, linesDown] = getLines(contentLines, info.row);

    const gap = ' '.repeat(largestLineNumberLength) + '| ';
    let startLine = info.row - NLINESUP + 1;
    // add all the lines above
    for (const line of linesUp) {
        if (line !== null) {
            const output = line.join('\n' + ' '.repeat(largestLineNumberLength - 1) + '\u21B3| ');
            buffer.push(grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + output));
        }
        ++startLine;
    }
    // add current line and ^^ pointers
    buffer.push(startLine.toString().padStart(largestLineNumberLength) + '| ' + targetLine[0]);
    ++startLine;
    buffer.push(' '.repeat(largestLineNumberLength) + grey('| ') + ' '.repeat(actualCol) + colors.red('^'.repeat(info.length) + ' ' + HTMessage(here)));
    // add all the lines below
    for (const line of linesDown) {
        if (line !== null) {
            const output = line.join(' ↵\n' + gap);
            buffer.push(grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + output));
        }
        ++startLine;
    }
    return buffer;
}

export function CreateProblemMessage(code: PlProblemCode, message: string) {
    const buffer = [];
    // hints
    const hint = PCHint(code);
    buffer.push(`${colors.yellow("Hint")}: ${wrapLine(hint, "    ↳ ")}`);
    // error
    const fullname = PCFullName(code);
    buffer.push(`${colors.cyan(PCFullName(code))}: ${wrapLine(message, ' '.repeat(fullname.length) + '↳ ')}`);
    return buffer;
}

export function LogProblem(problem: PlProblem, content: string): string {
    let buffer = [];
    const {code, info, message, here} = problem;

    buffer.push(...CreateProblemTitle(code, info));
    if (info != null) {
        buffer.push(...CreateProblemBody(here, info, content));
    }
    buffer.push('');

    buffer.push(...CreateProblemMessage(code, message));
    // print
    return buffer.join('\n');
}

export function LogCallbackProblem(problem: PlProblem): string {
    let buffer = [];
    const {code, info, message, here} = problem;
    buffer.push(...CreateProblemTitle(code, info));
    buffer.push('');
    buffer.push(...CreateProblemMessage(code, message));
    return buffer.join('\n');
}

export function LogProblemShort(problem: PlProblem) {
    return `${colors.cyan(PCFullName(problem.code))}: ${problem.message}`;
}

export function CreateFrame(name: string, info: PlFileInfo) {
    let text = `In frame '${name}'`;
    if (info) {
        text += ` on line ${info.row + 1}`;
    }
    return text;
}

export function LogTrace(trace: PlTrace) {
    let buffer = [];

    for (const frame of trace) {
        if (buffer.length == TRACE_MAX) {
            buffer.push(`... ${trace.length - TRACE_MAX} frame(s) omitted`);
            break;
        }

        buffer.push(CreateFrame(frame.name, frame.info));
    }

    buffer.reverse();
    return buffer.join('\n');
}
