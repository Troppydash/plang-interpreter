import {StackMachine} from "../../vm/machine";
import {PlDebug} from "../../vm/emitter/debug";
import {PlConverter} from "../../vm/machine/native/converter";
import {dddString} from "../../extension/text";
import {METHOD_SEP} from "../../vm/emitter";
import {UnscrambleFunction} from "../../vm/machine/scrambler";
import {PlStuffGetType, PlStuffTypeToString} from "../../vm/machine/stuff";
import PlToString = PlConverter.PlToString;
import PlToDebugString = PlConverter.PlToDebugString;

export async function IACTDebugger(machine: StackMachine): Promise<number> {
    const blessed = require('blessed');
    // TODO: Add eval and steps, and help alert

    /// FOR WINDOWS
    const isWindows = process.platform == "win32";
    const FOCUSED = '{yellow-fg}[F]{/}';
    const addFocus = (text) => {
        if (text.startsWith(FOCUSED)) return text;
        return `${FOCUSED} ${text}`;
    };
    const removeFocus = (text: string) => {
        if (!text.startsWith(FOCUSED)) return text;
        return text.substring(FOCUSED.length + 1);
    }

    let palette = {
        selected: {
            bg: 'grey',
            fg: 'white',
        },
        scrollbar: {
            bg: 'grey',
        }
    };
    if (isWindows) {
        palette = {
            selected: {
                bg: 'cyan',
                fg: 'white',
            },
            scrollbar: {
                bg: 'cyan',
            }
        };
    }

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
            content: "{bold}Interactive Debugger{/bold} Press 'Ctrl-C' or 'q' to exit\nPress 'Up' and 'Down' to choose the callframes and locals, press 'Enter' to select",
            shrink: true,
        });

        if (isWindows) {
            headerBox.setContent(headerBox.getContent() + "\n[F] shows the focused panel, press 'Tab' to switch panels");
        } else {
            headerBox.setContent(headerBox.getContent() + "\nClick on a panel to focus it");
        }

        const headerHeight = headerBox.content.split('\n').length;

        const debugBox = blessed.box({
            parent: screen,
            top: headerHeight,
            left: 0,
            height: 3,
            label: "{bold}Stepper{/}",
            border: 'line',
            tags: true,
            padding: {
                left: 1,
                right: 1,
            }
        });

        const stepNextButton = blessed.button({
            parent: debugBox,
            top: 0,
            left: 0,
            content: "Step",
        });


        let line = machine.pointer;
        let currentLineDebug: PlDebug = null;
        for (const debug of machine.program.debug) {
            if (line <= debug.endLine && line >= (debug.endLine - debug.length)) {
                if (currentLineDebug == null) currentLineDebug = debug;
                else {
                    if (currentLineDebug.length > debug.length) currentLineDebug = debug;
                }
            }
        }

        const stepNext = function() {
            // step next
            const nextLine = currentLineDebug.span.info.row + 1;

            // find the start of the next line of instructions
            let found = false;
            const program = machine.program.program.slice(machine.pointer);
            for (let i = 0; i < program.length; i++) {
                for (const debug of machine.program.debug) {
                    if (debug.endLine+debug.length == (i+machine.pointer)) {
                        if (debug.span.info.row == nextLine) {
                            currentLineDebug = debug;
                            line = i+machine.pointer;
                            found = true;
                            break;
                        }
                    }
                }
            }
            // use the step out then
            if (!found)
                return;

            // TODO: Fix this i am going to sleep
            machine.runProgram(machine.pointer, line); // check for errors and such

            updateContents();
            updateFrames();
            updateLocals();
        };


        stepNextButton.on('press', stepNext);
        screen.key(['n'], stepNext);

        const contentHeight = `100%-${headerHeight + 3}`;

        const contentLabel = `"${machine.file.filename}"`;
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
                style: {...palette.scrollbar}
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
        contentBox.data.label = contentLabel;

        // SET CONTENT
        const updateContents = function() {
            // add line numbers
            const fileContent = machine.file.content.split('\n');
            const margin = ('' + (fileContent.length - 1)).length;
            const text = fileContent.map((line, index) => {
                index += 1;
                const prefix = `${' '.repeat(margin - ('' + index).length)}${index}`;
                const newLine = `${prefix}|  ${line}`
                if (currentLineDebug.span.info.row + 1 == index) {
                    return `{red-bg}{white-fg}${newLine}{/white-fg}{/red-bg}`;
                }
                return newLine;
            }).join('\n');
            contentBox.setContent(text);

            // set scroll to current line
            contentBox.setScroll(currentLineDebug.span.info.row - 1);
            screen.render();
        }
        updateContents();

        const infoContainer = blessed.box({
            parent: screen,
            bottom: 0,
            left: '75%',
            tags: true,
            width: '25%',
            height: contentHeight,
        });

        const frameLabel = '{bold}Callframes{/bold}';
        const frameContainer = blessed.box({
            parent: infoContainer,
            label: frameLabel,
            tags: true,
            height: '35%',
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            }
        });
        frameContainer.data.label = frameLabel;

        const frameList = blessed.list({
            parent: frameContainer,
            top: 0,
            left: 0,
            height: '100%-2',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                style: {...palette.scrollbar}
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: {...palette.selected}
            },
            keys: true,
            tags: true,
        });

        // FRAMES
        let selectedTrace;
        const updateFrames = function() {
            frameList.clearItems();

            const framesText = [];
            const trace = machine.getTrace();
            trace.reverse();
            for (const frame of trace) {
                if (frame.info == null) {
                    framesText.push(`'${frame.name}'`);
                } else {
                    framesText.push(`'${frame.name}' at line ${frame.info.row + 1}`);
                }
            }
            frameList.setItems(framesText);

            frameList.on('select', function (item, index) {
                selectedTrace = trace[index];
                updateLocals();
            });

            frameList.select(trace.length - 1);
            selectedTrace = trace[trace.length - 1];
            screen.render();
        }
        updateFrames();


        const localsLabel = "{bold}Locals{/bold}";
        const localsContainer = blessed.text({
            parent: infoContainer,
            height: '65%+1',
            top: '35%',
            left: 0,
            label: localsLabel,
            tags: true,
            border: "line",
            padding: {
                left: 1,
                right: 1,
            },
        });
        localsContainer.data.label = localsLabel;

        const localsBox = blessed.list({
            parent: localsContainer,
            height: '100%-2',
            top: 0,
            left: 0,
            scrollable: true,
            alwaysScroll: true,
            tags: true,
            scrollbar: {
                style: {...palette.scrollbar}
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: {...palette.selected}
            },
            keys: true,
        });

        let items = {};
        const updateLocals = () => {
            let newLabel = `${localsLabel} of '${selectedTrace.name}'`;

            localsContainer.setLabel(newLabel);
            localsContainer.data.label = newLabel;

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
                const v = dddString(PlConverter.PlToString(value, machine, true), contentBox.width - key.length - 6);
                if (key.includes(METHOD_SEP)) {
                    const total = UnscrambleFunction(key);
                    localsBuffer.push(`{cyan-fg}${total[0]}{/cyan-fg}.${total[1]}: ${v}`);
                    continue;
                }
                localsBuffer.push(`{cyan-fg}${PlStuffTypeToString(value.type)}{/cyan-fg} ${key}: ${v}`);
            }
            if (std > 0) {
                const additional = blessed.text({
                    parent: localsContainer,
                    bottom: 0,
                    content: `... and ${std} standard values`,
                    height: 1,
                });
                localsBox.height = '100%-3';
            } else {
                localsBox.height = '100%-2';
            }
            localsBox.setItems(localsBuffer);
            localsBox.select(0);
            screen.render();
        };
        localsBox.on('select', function (_, index) {
            detailed.content = detailedHeader + '\nLoading...';
            detailed.show();

            const item: any = Object.values(items)[index];
            const key = Object.keys(items)[index];

            // https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
            const json = JSON.stringify(item.value, function (k, v) {
                return k && v && typeof v !== "number" ? (Array.isArray(v) ? `[array ${v.length}]` : "" + v) : v;
            }, 2);

            const contentBuffer = [detailedHeader];
            contentBuffer.push(`Name: '${key}'`);
            contentBuffer.push(`Type: {cyan-fg}${PlStuffGetType(item)}{/}`);
            contentBuffer.push(`Str(${key}): {green-fg}${PlToString(item, machine, true)}{/}`);
            contentBuffer.push(`Debug: {red-fg}${PlToDebugString(item)}{/}`);
            contentBuffer.push(`Internals: {yellow-fg}${json}{/}`)
            detailed.content = contentBuffer.join('\n');

            detailed.focus();
            detailed.render();
        });

        updateLocals();


        /// ALERT
        const detailedHeader = "{bold}Detailed View{/}{|}('ESC' or 'x' to close)";
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
        screen.key(['escape', 'x'], function () {
            detailed.hide();
        })
        detailed.hide();

        contentBox.on('click', () => contentBox.focus());
        frameList.on('click', () => frameList.focus());
        localsBox.on('click', () => localsBox.focus());

        const elements = [contentBox, frameContainer, localsContainer];
        let index = 0;
        const maxIndex = elements.length - 1;
        elements.forEach(function (box, i) {
            box.on('click', function () {
                const oldElement = elements[index];
                oldElement.setLabel(removeFocus(oldElement.data.label))
                oldElement.data.label = removeFocus(oldElement.data.label);
                index = i;

                screen.render();
            })
        });
        screen.key(['tab'], function () {
            const oldElement = elements[index];
            if (index == maxIndex) {
                index = 0;
            } else {
                index += 1;
            }
            const newElement = elements[index];

            newElement.focus();
            if (newElement.children.length > 1) {
                newElement.children[1].focus();
            }

            // because windows is weird
            newElement.setLabel(addFocus(newElement.data.label));
            newElement.data.label = addFocus(newElement.data.label);
            oldElement.setLabel(removeFocus(oldElement.data.label))
            oldElement.data.label = removeFocus(oldElement.data.label);
            screen.render();
        })

        elements[0].setLabel(`${FOCUSED} ` + elements[0].data.label);
        elements[0].data.label = `${FOCUSED} ` + elements[0].data.label;


        screen.key(['C-c', 'q'], function (ch, key) {
            screen.destroy();
            resolve(0);
        });

        contentBox.focus();
        screen.render();
        screen.program.hideCursor();
    });
}
