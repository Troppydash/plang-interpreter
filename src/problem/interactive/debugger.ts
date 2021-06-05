import {StackMachine} from "../../vm/machine";
import {PlDebug} from "../../vm/emitter/debug";
import {PlConverter} from "../../vm/machine/native/converter";
import {dddString} from "../../extension/text";
import {METHOD_SEP} from "../../vm/emitter";
import {UnscrambleFunction} from "../../vm/machine/scrambler";

export async function IACTDebugger(machine: StackMachine): Promise<number> {
    const blessed = require('blessed');
    return new Promise(resolve => {
        const screen = blessed.screen({
            smartCSR: true,
            title: "Interactive Debugger",
        });

        const headerBox = blessed.box({
            parent: screen,
            top: 0,
            left: 0,
            tags: true,
            content: "{bold}Interactive Debugger{/bold}\nPress 'enter' to exit",
            shrink: true,
        });

        const contentHeight = `100%-${headerBox.content.split('\n').length + 1}`;

        // text box
        const contentBox = blessed.box({
            parent: screen,
            bottom: 0,
            left: 0,
            tags: true,
            keys: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                style: {
                    bg: 'yellow',
                }
            },
            label: machine.file.filename,
            width: '75%',
            height: contentHeight,
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            },
        });
        contentBox.focus();

        // get current line
        const line = machine.pointer;
        let d: PlDebug = null;
        for (const debug of machine.program.debug) {
            if (line <= debug.endLine && line >= (debug.endLine-debug.length)) {
                if (d == null) d = debug;
                else {
                    if (d.length > debug.length) d = debug;
                }
            }
        }

        // add line numbers
        const fileContent = machine.file.content.split('\n');
        const margin = (''+(fileContent.length-1)).length;
        const text = fileContent.map((line, index) => {
            index += 1;
            const prefix = `${' '.repeat(margin-(''+index).length)}${index}`;
            const newLine = `${prefix}|  ${line}`
            if (d.span.info.row+1 == index) {
                return `{white-bg}{black-fg}${newLine}{/black-fg}{/white-bg}`;
            }
            return newLine;
        }).join('\n');
        contentBox.setContent(text);

        // set scroll to current line
        contentBox.setScroll(d.span.info.row+1);

        const infoBox = blessed.box({
            parent: screen,
            bottom: 0,
            left: '75%',
            tags: true,
            keys: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                style: {
                    bg: 'yellow',
                }
            },
            label: "info",
            width: '25%',
            height: contentHeight,
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            },
        });

        const infoBuffer = [];

        // add frames
        infoBuffer.push('{bold}Callframes{/bold}')
        const trace = machine.getTrace();
        if (trace.length == 0) {
            infoBuffer.push("none");
        } else {
            for (const frame of trace) {
                infoBuffer.push(`'${frame.name}' at line ${frame.info.row+1}`);
            }
        }

        infoBuffer.push('{bold}Locals{/bold}');
        let std = 0;
        for (const [key, value] of Object.entries(machine.stackFrame.values)) {
            if (machine.standard.includes(key)) {
                std++;
                continue;
            }
            if (key.includes(METHOD_SEP)) {
                const total = UnscrambleFunction(key);
                infoBuffer.push(`impl ${total[1]} for ${total[0]}`);
                continue;
            }
            infoBuffer.push(`${key}: ${dddString(PlConverter.PlToString(value, machine), contentBox.width-key.length-6)}`);
        }
        infoBuffer.push(`... and ${std} builtins`);


        infoBox.setContent(infoBuffer.join('\n'));



        screen.key(['C-c', 'enter'], function (ch, key) {
            resolve(0);
        });

        screen.render();
    });
}
