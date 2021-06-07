import {StackMachine} from "../../vm/machine";
import {PlDebug} from "../../vm/emitter/debug";
import {PlConverter} from "../../vm/machine/native/converter";
import {dddString} from "../../extension/text";
import {METHOD_SEP} from "../../vm/emitter";
import {UnscrambleFunction} from "../../vm/machine/scrambler";
import {PlStuffGetType, PlStuffTypeToString} from "../../vm/machine/stuff";
import PlToString = PlConverter.PlToString;

export async function IACTDebugger(machine: StackMachine): Promise<number> {
    const blessed = require('blessed');
    // TODO: Add eval and steps

    /// FOR WINDOWS
    const isWindows = process.platform == "win32";
    const FOCUSED = '{yellow-fg}[F]{/}';
    const addFocus = (text) => {
        if (text.startsWith(FOCUSED)) return;
        return `${FOCUSED} ${text}`;
    };
    const removeFocus = (text) => {
        if (!text.startsWith(FOCUSED)) return;
        return text.slice(FOCUSED.length + 1);
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
    // const handleListFocus = (list) => {
    //     return (index) => {
    //         const oldIndex = list.data.oldIndex;
    //         if (oldIndex != undefined) {
    //             list.getItem(oldIndex).setContent(removeFocus(list.getItem(oldIndex).content));
    //         }
    //         list.data.oldIndex = index;
    //         list.getItem(index).setContent(addFocus(list.getItem(index).content));
    //         list.screen.render();
    //     }
    // };

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
            headerBox.setContent(headerBox.getContent() + "\nHover your cursor on a panel to focus");
        }

        const contentHeight = `100%-${headerBox.content.split('\n').length + 1}`;

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
                style: palette.scrollbar
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
        { // get current line
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
        }

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
                style: palette.scrollbar
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: palette.selected
            },
            keys: true,
            tags: true,
        });

        // FRAMES
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
        frameList.setItems(framesText);

        frameList.on('select', function (item, index) {
            if (trace.length > 0) {
                selectedTrace = trace[index];
                updateLocals();
            }
        });

        // if (isWindows) {
        //     frameList.on("select item", handleListFocus(frameList));
        // }

        let selectedTrace = null;
        if (trace.length > 0) {
            frameList.select(trace.length - 1);
            selectedTrace = trace[trace.length - 1];
        }


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
                style: palette.scrollbar
            },
            style: {
                focus: {
                    scrollbar: {
                        bg: 'white'
                    }
                },
                selected: palette.selected
            },
            keys: true,
        });

        let items = {};
        const updateLocals = () => {
            let newLabel;
            if (!selectedTrace) {
                newLabel = `${localsLabel} of 'global'`;
            } else {
                newLabel = `${localsLabel} of '${selectedTrace.name}'`;
            }
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
                localsBox.height = '100%-4';
            } else {
                localsBox.height = '100%-3';
            }
            localsBox.setItems(localsBuffer);
            // localsBox.data.oldIndex = undefined;
            localsBox.select(0);
            // if (localsBoxFocus) localsBoxFocus(0);
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
            contentBuffer.push(`Internals: {yellow-fg}${json}{/}`)
            detailed.content = contentBuffer.join('\n');

            detailed.focus();
            detailed.render();
        });

        // let localsBoxFocus = null;
        // if (isWindows) {
        //     localsBoxFocus = handleListFocus(localsBox);
        //     updateLocals();
        //     localsBox.on("select item", localsBoxFocus);
        // } else {
        // }
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

        const elements = [contentBox, frameContainer, localsContainer];
        let index = 0;
        const maxIndex = elements.length - 1;
        for (let i = 0; i < elements.length; i++) {
            const box = elements[i];
            box.on('click', function () {
                const oldElement = elements[index];
                oldElement.setLabel(removeFocus(oldElement.data.label))
                oldElement.data.label = removeFocus(oldElement.data.label);
                index = i;


                box.focus();
                if (box.children.length > 1) {
                    box.children[1].focus();
                }

                screen.render();
            })
        }
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
            screen.destroy(); // make sure to remove the screen
            resolve(0);
        });

        contentBox.focus();
        screen.render();
        screen.program.hideCursor();
    });
}
