import {HTMessage, PlHereType, PlProblem} from "./problem";
import {PCFullName, PCHint, PlProblemCode} from "./codes";
import {colors} from "../inout/color";
import {PlTrace} from "./trace";
import {PlFileInfo} from "../compiler/lexing/info";
import { dddString, lineWrap, replaceForAll} from "../extension/text";

const NLINESUP = 1; // Lines above
const NLINESDOWN = 2; // Lines below

const CHARWRAP = 60; // Max line width
const TRACE_MAX = 3; // Max number of traces
const NEWLINE_SYMBOL = " "; // <- symbol

type Line = string;

/**
 * Create a multiline text from a single long line, where each new line is of **prefix**,
 * and with the consideration of an offset
 * @param line The source line
 * @param prefix The prefix for newline
 * @param offset The line offset
 */
function multiLine(line: string, prefix: string, offset: number) {
    return replaceForAll(lineWrap(line, CHARWRAP-offset), '\n', '\n'+prefix);
}

function getLine(lines: string[], targetRow: number): Line | null {
    if (targetRow >= 0 && targetRow < lines.length) {
        return dddString(lines[targetRow], CHARWRAP);
    }
    return null;
}

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

    let startLine = info.row - NLINESUP + 1;
    // add all the lines above
    for (const line of linesUp) {
        if (line !== null) {
            buffer.push(grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + line));
        }
        ++startLine;
    }
    // add current line and ^^ pointers
    buffer.push(startLine.toString().padStart(largestLineNumberLength) + '| ' + targetLine);
    ++startLine;
    buffer.push(' '.repeat(largestLineNumberLength) + grey('| ') + ' '.repeat(actualCol) + colors.red('^'.repeat(info.length) + ' ' + HTMessage(here)));
    // add all the lines below
    for (const line of linesDown) {
        if (line !== null) {
            buffer.push(grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + line));
        }
        ++startLine;
    }
    return buffer;
}

export function CreateProblemMessage(code: PlProblemCode, message: string) {
    const buffer = [];
    // hints
    const hint = PCHint(code);
    buffer.push(`${colors.yellow("Hint")}: ${multiLine(hint, `    ${NEWLINE_SYMBOL} `, 6)}`);
    // error
    const fullname = PCFullName(code);
    buffer.push(`${colors.cyan(fullname)}: ${multiLine(message, ' '.repeat(fullname.length) + `${NEWLINE_SYMBOL} `, fullname.length+2)}`);
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
