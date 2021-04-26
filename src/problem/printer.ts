import {HTMessage, PlProblem} from "./problem";
import {PCFullName, PCHint} from "./codes";
import inout from "../inout";
import {colors} from "../inout/color";
import {chunkString} from "../extension";
import { PlTrace, PlTraceFrame } from "./trace";

const NLINESUP = 1;
const NLINESDOWN = 2;
const CHARWRAP = 80;
const TRACE_MAX = 4;


function wrapLine(line: string, header: string) {
    return line.split('\n').map(l => chunkString(l, CHARWRAP).join('\n'+header)).join('\n'+header); // TODO: make this prettier
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

export function LogProblem(problem: PlProblem, content: string) {
    let buffer = [];

    const {code, fileInfo, message, here} = problem;

    if (fileInfo == null) {
        buffer.push(`[${code}] There is no debug information`);
    } else {
        const actualCol = fileInfo.col - fileInfo.length;
        const largestLineNumberLength = (fileInfo.row + NLINESDOWN).toString().length;

        // add header
        // buffer.push(`[${code}] In "${fileInfo.filename}" at ${fileInfo.row + 1}:${actualCol + 1}`);
        buffer.push(`[${code}] In "${fileInfo.filename}" on line ${fileInfo.row + 1}`);

        // lines and stuff
        const contentLines = content.split('\n');
        const [linesUp, targetLine, linesDown] = getLines(contentLines, fileInfo.row);

        const gap = ' '.repeat(largestLineNumberLength) + '| ';
        let startLine = fileInfo.row - NLINESUP + 1;
        // add all the lines above
        for (const line of linesUp) {
            if (line !== null) {
                const output = line.join('\n' + ' '.repeat(largestLineNumberLength-1) + '\u21B3| ');
                buffer.push(colors.grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + output));
            }
            ++startLine;
        }
        // add current line and ^^ pointers
        buffer.push(startLine.toString().padStart(largestLineNumberLength) + '| ' + targetLine[0]);
        ++startLine;
        buffer.push(' '.repeat(largestLineNumberLength) + colors.grey('| ') + ' '.repeat(actualCol) + colors.red('^'.repeat(fileInfo.length) + ' ' + HTMessage(here)));
        // add all the lines below
        for (const line of linesDown) {
            if (line !== null) {
                const output = line.join(' ↵\n' + gap);
                buffer.push(colors.grey(startLine.toString().padStart(largestLineNumberLength) + '| ' + output));
            }
            ++startLine;
        }
    }

    buffer.push('');

    // hints
    const hint = PCHint(code);
    buffer.push(`${colors.yellow("Hint")}: ${wrapLine(hint, "    ↳ ")}`);
    // error
    const fullname = PCFullName(code);
    buffer.push(`${colors.cyan(PCFullName(code))}: ${wrapLine(message, ' '.repeat(fullname.length)+'↳ ')}`);

    // print
    inout.print(buffer.join('\n'));
}

export function LogProblemShort(problem: PlProblem) {
    return `${colors.cyan(PCFullName(problem.code))}: ${problem.message}`;
}

export function LogTrace(trace: PlTrace) {
    let buffer = [];

    for (const frame of trace) {
        if (buffer.length == TRACE_MAX) {
            buffer.push(`... ${trace.length-TRACE_MAX} frame(s) omitted`);
            break;
        }

        let text = `In frame '${frame.name}'`;
        if (frame.info) {
            text += ` on line ${frame.info.row+1}, inside file "${frame.info.filename}"`;
        }
        buffer.push(text);
    }

    buffer.reverse();
    inout.print(buffer.join('\n'));
}
