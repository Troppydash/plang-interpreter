import {PlTrace} from "./trace";
import {NewPlProblem, PlProblem} from "./problem";
import {colors} from "../inout/color";
import {
    CreateFrame,
    CreateProblemBody,
    CreateProblemMessage,
    CreateProblemTitle,
} from "./printer";

const TRACE_MAX = 8;

export function StartInteractive(content: string, problems: PlProblem[], trace: PlTrace) {
    const blessed = require('blessed');

    return new Promise((resolve) => {
        const screen = blessed.screen({
            smartCSR: true
        });

        const maxIndex = trace.length - 1;
        const minIndex = 0;
        let traceIndex = 0;
        const renderText = (index) => {
            const buffer = ['{bold}Interactive Frame Viewer{/bold}', "Press 'enter' to exit", ''];
            buffer.push(colors.red('\nCallframes (Most Recent Last)'));

            let line = maxIndex-index;
            let above = minIndex;
            let below = maxIndex;
            if (TRACE_MAX < trace.length) {
                above = line - Math.floor((TRACE_MAX - 1) / 2);
                below = line + Math.floor(TRACE_MAX / 2);
                if (above < minIndex) {
                    above = 0;
                }
                if (below > maxIndex)
                    below = maxIndex;
            }

            if (above > minIndex) {
                buffer.push(`...omitted ${above - minIndex} frame(s)`);
            }
            for (let i = above; i <= below; ++i) {
                let out = CreateFrame(trace[maxIndex-i].name, trace[maxIndex-i].info);
                if (i == line) {
                    out = `{white-bg}{black-fg}${out}{/black-fg}{/white-bg}`
                }
                buffer.push(out)
            }

            if (below < maxIndex) {
                buffer.push(`...omitted ${maxIndex - below} frames(s)`);
            }

            buffer.push('');

            const frame = trace[index];
            const code = frame.name;
            const info = frame.info;

            buffer.push(...CreateProblemTitle(code, info));
            if (info != null) {
                if (process.platform == "win32") {
                    buffer.push(...CreateProblemBody("here", info, content, message => message));
                } else {
                    buffer.push(...CreateProblemBody("here", info, content));
                }
            }

            buffer.push('');
            buffer.push(...CreateProblemMessage(problems[0].code, problems[0].message));
            return buffer.join('\n');
        }

        const box = blessed.box({
            top: 'center',
            left: 'center',
            width: '100%',
            height: '100%',
            content: renderText(traceIndex),
            tags: true,
        });

        screen.append(box);

        screen.key(['up', 'down'], function (ch, key) {
            if (key.name == 'up')
                traceIndex += 1;
            else
                traceIndex -= 1;

            if (traceIndex < 0)
                traceIndex = 0;
            else if (traceIndex > trace.length - 1)
                traceIndex = trace.length - 1;

            box.setContent(renderText(traceIndex));
            screen.render();
        })

        screen.key(['escape', 'q', 'C-c', 'enter'], function (ch, key) {
            resolve(true);
        });

        box.focus();
        screen.render();
    });
}
