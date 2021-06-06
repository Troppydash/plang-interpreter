import {StackMachine} from "../../vm/machine";
import {PlDebug} from "../../vm/emitter/debug";
import {PlConverter} from "../../vm/machine/native/converter";
import {dddString} from "../../extension/text";
import {METHOD_SEP} from "../../vm/emitter";
import {UnscrambleFunction} from "../../vm/machine/scrambler";
import {PlStuffGetType, PlStuffTypeToString} from "../../vm/machine/stuff";

export async function IACTDebugger(machine: StackMachine): Promise<number> {
    // TODO: Add eval and steps
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
            content: "{bold}Interactive Debugger{/bold}\nPress 'Ctrl-C' to exit\nPress 'Up' and 'Down' to select the callframes and locals, press 'Enter' to select",
            shrink: true,
        });

        const contentHeight = `100%-${headerBox.content.split('\n').length + 1}`;

        const contentLabel = `"${machine.file.filename}"`;
        // text box
        const contentBox = blessed.box({
            parent: screen,
            bottom: 0,
            left: 0,
            tags: true,
            mouse: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                style: {
                    bg: 'grey',
                }
            },
            label: contentLabel,
            width: '75%',
            height: contentHeight,
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                }
            }
        });
        contentBox.focus();
        contentBox.on('click', () => contentBox.focus());

        // get current line
        const line = machine.pointer;
        let d: PlDebug = null;
        for (const debug of machine.program.debug) {
            if (line <= debug.endLine && line >= (debug.endLine - debug.length)) {
                if (d == null) d = debug;
                else {
                    if (d.length > debug.length) d = debug;
                }
            }
        }

        // add line numbers
        const fileContent = machine.file.content.split('\n');
        const margin = ('' + (fileContent.length - 1)).length;
        const text = fileContent.map((line, index) => {
            index += 1;
            const prefix = `${' '.repeat(margin - ('' + index).length)}${index}`;
            const newLine = `${prefix}|  ${line}`
            if (d.span.info.row + 1 == index) {
                return `{red-bg}{white-fg}${newLine}{/white-fg}{/red-bg}`;
            }
            return newLine;
        }).join('\n');
        contentBox.setContent(text);

        // set scroll to current line
        contentBox.setScroll(d.span.info.row - 1);


        const infoBox = blessed.box({
            parent: screen,
            bottom: 0,
            left: '75%',
            tags: true,
            label: "info",
            width: '25%',
            height: contentHeight,
        });

        const framesTextBox = blessed.box({
            parent: infoBox,
            content: '{bold}Callframes{/bold}',
            tags: true,
            height: '35%',
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            }
        });

        const frames = blessed.list({
            parent: framesTextBox,
            top: 1,
            left: 0,
            height: '100%-3',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                style: {
                    bg: 'grey',
                }
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: {
                    bg: 'grey',
                    fg: 'white',
                }
            },
            keys: true,
        });
        const framesText = [];
        const trace = machine.getTrace();
        trace.reverse();
        if (trace.length == 0) {
            framesText.push("none");
        } else {
            for (const frame of trace) {
                framesText.push(`'${frame.name}' at line ${frame.info.row + 1}`);
            }
        }
        frames.setItems(framesText);
        frames.on('click', () => frames.focus());

        frames.on('select', function (item, index) {
            if (trace.length > 0) {
                selectedTrace = trace[index];
                updateLocals();
            }
        });

        let selectedTrace = null;
        if (trace.length > 0) {
            frames.select(trace.length - 1);
            selectedTrace = trace[trace.length - 1];
        }


        const localsText = "{bold}Locals{/bold}";
        const localsTextBox = blessed.text({
            parent: infoBox,
            height: '65%+1',
            top: '35%',
            left: 0,
            content: "{bold}Locals{/bold}",
            tags: true,
            border: "line",
            padding: {
                left: 1,
                right: 1,
            },
        });

        const localsBox = blessed.list({
            parent: localsTextBox,
            height: '100%-3',
            top: 1,
            left: 0,
            scrollable: true,
            alwaysScroll: true,
            tags: true,
            scrollbar: {
                style: {
                    bg: 'grey',
                }
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: {
                    bg: 'grey',
                    fg: 'white',
                }
            },
            keys: true,
        });
        localsBox.on('click', () => localsBox.focus());

        let items = {};
        const updateLocals = () => {
            if (!selectedTrace) {
                localsTextBox.setContent(`${localsText} of 'global'`)
            } else {
                localsTextBox.setContent(`${localsText} of '${selectedTrace.name}'`)
            }
            const localsBuffer = [];

            let frame = machine.stackFrame;
            if (selectedTrace) {
                do {
                    if (frame.trace == selectedTrace) {
                        break;
                    }
                    frame = frame.outer;
                } while (frame != null);
                if (frame == null) return;
            }

            items = {};
            let std = 0;
            for (const [key, value] of Object.entries(frame.values)) {
                if (machine.standard.includes(key)) {
                    std++;
                    continue;
                }
                items[key] = value;
                const v = dddString(PlConverter.PlToString(value, machine), contentBox.width - key.length - 6);
                if (key.includes(METHOD_SEP)) {
                    const total = UnscrambleFunction(key);
                    localsBuffer.push(`{cyan-fg}${total[0]}{/cyan-fg}.${total[1]}: ${v}`);
                    continue;
                }
                localsBuffer.push(`{cyan-fg}${PlStuffTypeToString(value.type)}{/cyan-fg} ${key}: ${v}`);
            }
            if (std > 0) {
                const additional = blessed.text({
                    parent: localsTextBox,
                    bottom: 0,
                    content: `... and ${std} standard values`,
                    height: 1,
                });
                localsBox.height = '100%-4';
            } else {
                localsBox.height = '100%-3';
            }
            localsBox.select(0);
            localsBox.setItems(localsBuffer);
            screen.render();
        };
        updateLocals();


        localsBox.on('select', function(_, index) {
            detailed.content = detailedHeader + '\nLoading...';
            detailed.show();
            detailed.focus();

            const item: any = Object.values(items)[index];
            const key = Object.keys(items)[index];

            // https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
            const json = JSON.stringify(item.value, function (k, v) { return k && v && typeof v !== "number" ? (Array.isArray(v) ? `[array ${v.length}]` : "" + v) : v; }, 2);

            const contentBuffer = [detailedHeader];
            contentBuffer.push(`Name: '${key}'`);
            contentBuffer.push(`Type: {cyan-fg}${PlStuffGetType(item)}{/}`);
            contentBuffer.push(`Internals: {yellow-fg}${json}{/}`)
            detailed.content = contentBuffer.join('\n');

        });

        const detailedHeader = "{bold}Detailed View{/}{|}(ESC to close)";
        const detailed = blessed.box({
            parent: screen,
            top: '25%',
            left: '25%',
            width: '50%',
            shrink: true,
            border: 'line',
            draggable: true,
            tags: true,
            content: "{bold}Detailed View{/}{|}(ESC to close)",
            padding: {
                left: 1,
                right: 1,
            }
        });
        screen.key(['escape'], function () {
            detailed.hide();
        })
        detailed.hide();


        screen.key(['C-c', 'q'], function (ch, key) {
            for (const child of screen.children) {
                child.free();
                screen.remove(child);
            }
            screen.free();
            resolve(0);
        });

        screen.render();
    });
}
