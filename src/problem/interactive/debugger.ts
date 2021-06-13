import {StackMachine} from "../../vm/machine";
import {PlDebug} from "../../vm/emitter/debug";
import {PlConverter} from "../../vm/machine/native/converter";
import {dddString, shallowJSON} from "../../extension/text";
import {EmitProgram, METHOD_SEP} from "../../vm/emitter";
import {UnscrambleFunction} from "../../vm/machine/scrambler";
import {PlStuffGetType, PlStuffType, PlStuffTypeToString} from "../../vm/machine/stuff";
import {PlBytecodeType} from "../../vm/emitter/bytecode";
import {PlStackFrame} from "../../vm/machine/memory";
import PlToString = PlConverter.PlToString;
import PlToDebugString = PlConverter.PlToDebugString;
import {NewPlFile} from "../../inout/file";
import {PlAstParser} from "../../compiler/parsing";
import PlLexer from "../../compiler/lexing";


/// THIS IS A BADLY WRITTEN DEBUGGER, THERE ARE A LOT OF BUGS HERE SO GOOD LUCK
let isDebugging = false;

export async function IACTDebugger(machine: StackMachine): Promise<number | null> {
    // early return
    machine.stack.push(null);

    if (isDebugging) {
        return Promise.resolve(null);
    }
    isDebugging = true;

    const blessed = require('blessed');

    // TODO: Add eval and help alert

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
            label: "{bold}Functions{/}",
            border: 'line',
            tags: true,
            padding: {
                left: 1,
                right: 1,
            }
        });

        // STEP NEXT
        const stepNextButton = blessed.button({
            parent: debugBox,
            content: "Step [N]",
            height: 1,
            top: 0,
            left: 0,
            mouse: true,
            shrink: true,

            style: {
                fg: 'green',
                focus: {
                    fg: 'white'
                }
            }
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

        const stepNext = function () {
            const program = machine.program.program;
            // stop returning here
            if (program[machine.pointer].type == PlBytecodeType.DORETN)
                return;

            const oldLine = currentLineDebug.span.info.row;
            let surround = 0;
            let lastState = machine.saveState();
            let first = true;
            const out = machine.runProgram(machine.pointer, (lastPointer, thisPointer) => {
                if (first) {
                    first = false;
                    return false;
                }

                const lastByte = program[lastPointer];
                if (lastByte.type == PlBytecodeType.DOCALL) {
                    // check if it is function
                    const fn = lastState.stack[lastState.stack.length - 1];
                    if (fn && fn.type == PlStuffType.Func) {
                        surround += 1;
                    }
                }
                const thisByte = program[thisPointer];
                if ([PlBytecodeType.JMPREL, PlBytecodeType.STKEXT, PlBytecodeType.STKENT].includes(thisByte.type)) {
                    return false;
                }
                if (lastByte.type == PlBytecodeType.DORETN) {
                    if (surround > 0)
                        surround -= 1;
                } else if (lastByte.type == PlBytecodeType.STKPOP || lastByte.type == PlBytecodeType.JMPICF) {
                    if (surround <= 0) {
                        let found = null;
                        for (const debug of machine.program.debug) {
                            if (thisPointer <= debug.endLine && (debug.endLine - debug.length) <= thisPointer) {
                                if (debug.span.info.row != oldLine) {
                                    if (found == null) {
                                        found = debug;
                                    } else if (debug.length < found.length) {
                                        found = debug;
                                    }
                                    break;
                                }
                            }
                        }
                        if (found && found.name != "ASTCondition" && found.span.info.filename.length > 0) {
                            currentLineDebug = found;
                            line = thisPointer;
                            return true;
                        } else {
                            return false;
                        }
                    }
                }

                lastState = machine.saveState();
                return false;
            }); // check for errors and such
            if (machine.problems.length != 0) {
                cleanup();
                throw null;
            }

            // top level returns
            if (out != null) {
                if (typeof out.value == "number")
                    return cleanup(out.value);
                return cleanup(0);
            }
            updateContents();
            updateFrames();
            updateLocals();
        };

        stepNextButton.on('press', stepNext);
        screen.key(['n'], stepNext);

        // STEP INTO
        const stepIntoButton = blessed.button({
            parent: debugBox,
            content: "Step Into [M]",
            height: 1,
            top: 0,
            left: stepNextButton.content.length + 2,
            mouse: true,
            shrink: true,

            style: {
                fg: 'green',
                focus: {
                    fg: 'white'
                }
            }
        });

        const stepInto = function () {
            const program = machine.program.program;
            // stop returning here
            if (program[machine.pointer].type == PlBytecodeType.DORETN)
                return;

            const oldLine = currentLineDebug.span.info.row;
            let surround = 0;
            let lastState = machine.saveState();
            let first = true;
            const out = machine.runProgram(machine.pointer, (lastPointer, thisPointer) => {
                if (first) {
                    first = false;
                    return false;
                }

                const lastByte = program[lastPointer];

                const thisByte = program[thisPointer];
                if ([PlBytecodeType.JMPREL, PlBytecodeType.STKEXT, PlBytecodeType.STKENT].includes(thisByte.type)) {
                    return false;
                }
                if (lastByte.type == PlBytecodeType.STKPOP || lastByte.type == PlBytecodeType.JMPICF) {
                    if (surround <= 0) {
                        let found = null;
                        for (const debug of machine.program.debug) {
                            if (thisPointer <= debug.endLine && (debug.endLine - debug.length) <= thisPointer) {
                                if (debug.span.info.row != oldLine) {
                                    if (found == null) {
                                        found = debug;
                                    } else if (debug.length < found.length) {
                                        found = debug;
                                    }
                                    break;
                                }
                            }
                        }
                        if (found && found.name != "ASTCondition" && found.span.info.filename.length > 0) {
                            currentLineDebug = found;
                            line = thisPointer;
                            return true;
                        } else {
                            return false;
                        }
                    }
                }

                lastState = machine.saveState();
                return false;
            }); // check for errors and such
            if (machine.problems.length != 0) {
                cleanup();
                throw null;
            }

            // top level returns
            if (out != null) {
                if (typeof out.value == "number")
                    return cleanup(out.value);
                return cleanup(0);
            }
            updateContents();
            updateFrames();
            updateLocals();
        };
        stepIntoButton.on('press', stepInto);
        screen.key(['m'], stepInto);

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
        const updateContents = function () {
            // add line numbers
            const fileContent = machine.file.content.split('\n');
            const margin = ('' + (fileContent.length)).length;
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
        let selectedFrame;
        let frames;
        const updateFrames = function () {
            frameList.clearItems();

            const framesText = [];
            frames = machine.getFrames();
            frames.reverse();
            for (const frame of frames) {
                if (frame.trace) {
                    if (frame.trace.info == null) {
                        framesText.push(`'${frame.trace.name}'`);
                    } else {
                        framesText.push(`'${frame.trace.name}' at line ${frame.trace.info.row + 1}`);
                    }
                } else {
                    framesText.push(`|frame|`);
                }
            }
            frameList.setItems(framesText);
            frameList.select(frames.length - 1);
            selectedFrame = frames[frames.length - 1];
            screen.render();
        }
        frameList.on('select', function (item, index) {
            selectedFrame = frames[index];
            updateLocals();
        });
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

        const additional = blessed.text({
            parent: localsContainer,
            bottom: 0,
            height: 1,
        });
        additional.hide();
        let items = {};
        const updateLocals = () => {
            let newLabel = `${localsLabel} of '|frame|'`;
            if (selectedFrame.trace) {
                newLabel = `${localsLabel} of '${selectedFrame.trace.name}'`;
            }

            localsContainer.setLabel(newLabel);
            localsContainer.data.label = newLabel;

            const localsBuffer = [];

            const frame: PlStackFrame = selectedFrame;

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
                    if (total[1].length == 0) {
                        localsBuffer.push(`{yellow-fg}[H]{/} {cyan-fg}${PlStuffTypeToString(value.type)}{/cyan-fg} ${total[0]}: ${v}`);
                    } else {
                        localsBuffer.push(`{cyan-fg}${total[0]}{/cyan-fg}.${total[1]}: ${v}`);
                    }
                    continue;
                }
                localsBuffer.push(`{cyan-fg}${PlStuffTypeToString(value.type)}{/cyan-fg} ${key}: ${v}`);
            }
            if (std > 0) {
                additional.setContent( `... and ${std} standard values`);
                additional.show();
                localsBox.height = '100%-3';
            } else {
                additional.hide();
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

            const json = shallowJSON(item.value);

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

        // EVAL
        const evalButton = blessed.button({
            parent: debugBox,
            height: 1,
            left: stepNextButton.content.length + stepIntoButton.content.length + 4,
            top: 0,
            content: "Eval [E]",
            shrink: true,
            mouse: true,
            style: {
                fg: 'green',
                focus: {
                    fg: 'white'
                }
            }
        });

        const evalAlert = blessed.box({
            parent: screen,
            tags: true,
            top: '25%',
            left: '25%',
            width: '50%',
            height: '75%',
            border: 'line',
            draggable: true,
            padding: {
                left: 1,
                right: 1,
            }
        });
        evalAlert.key(['escape', 'x'], function () {
            evalAlert.hide();
        })
        evalAlert.hide();
        const evalHeader = blessed.text({
            parent: evalAlert,
            content: "{bold}Eval{/}{|}('esc' or 'x' to close)",
            tags: true,
            top: 0,
            left: 0,
            height: 1,
            shrink: true,
        });

        const openEval = function () {
            evalOutput.setContent('');
            evalOutput.hide();
            evalOutput.show();
            evalAlert.show();
            evalInput.focus();
            evalAlert.render();
        }
        evalButton.on('click', openEval);
        screen.key(['e'], openEval);


        const evalInput = blessed.textbox({
            parent: evalAlert,
            inputOnFocus: true,
            top: 1,
            left: 0,
            height: 3,
            border: 'line',
            padding: {
                left: 1,
                right: 1,
            }
        });
        evalInput.key(['escape'], () => evalAlert.focus());

        const evalOutput = blessed.box({
            parent: evalAlert,
            top: 4,
            left: 0,
            border: 'line',
            height: '100%-6',
            tags: true,
            label: "{bold}Output{/}",
            padding: {
                left: 1,
                right: 1,
            }
        });

        evalInput.on('submit', function () {
            const value = evalInput.value;
            evalInput.clearValue();

            const file = NewPlFile("debugger", value);
            const lexer = new PlLexer(file);
            const parser = new PlAstParser(lexer);
            const ast = parser.parseAll();
            if (ast == null) {
                evalOutput.setContent('{red-fg}failed to parse input{/}');
                evalOutput.hide();
                evalOutput.show();

                evalInput.focus();
                evalOutput.render();
                return;
            }
            // add to end of vm and run
            const startPointer = machine.program.program.length;
            const program = EmitProgram(ast, false);
            program.program.pop();
            program.debug = [];
            machine.addProgram(program);
            const oldPointer = machine.pointer;
            machine.runProgram(startPointer);
            machine.pointer = oldPointer;
            if (machine.problems.length > 0) {
                evalOutput.setContent('{red-fg}failed to interpret input{/}');
                machine.problems = [];
                evalOutput.hide();
                evalOutput.show();

                evalInput.focus();
                evalOutput.render();
                return;
            }
            const out = machine.stack.pop();

            const json = shallowJSON(out.value);

            const contentBuffer = [];
            contentBuffer.push(`Type: {cyan-fg}${PlStuffGetType(out)}{/}`);
            contentBuffer.push(`Str(input): {green-fg}${PlToString(out, machine, true)}{/}`);
            contentBuffer.push(`Debug: {red-fg}${PlToDebugString(out)}{/}`);
            contentBuffer.push(`Internals: {yellow-fg}${json}{/}`)
            evalOutput.content = contentBuffer.join('\n');

            evalOutput.hide();
            evalOutput.show();

            evalInput.focus();
            evalOutput.render();
        });


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
            padding: {
                left: 1,
                right: 1,
            }
        });
        detailed.key(['escape', 'x'], function () {
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

        machine.pointer += 1;
        const cleanup = function (code?: number) {
            isDebugging = false;
            screen.destroy();
            machine.pointer -= 1;
            if (code != undefined)
                machine.returnCode = code;
            resolve(null);
        }

        screen.key(['C-c', 'q'], cleanup);

        contentBox.focus();
        screen.render();
        screen.program.hideCursor();
    });
}
