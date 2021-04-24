import {PlBytecodeType, PlProgram} from "../emitter/bytecode";
import {PlDebug, PlDebugProgram} from "../emitter/debug";
import {PlStackFrame} from "./memory";
import {NewPlProblem, PlProblem} from "../../problem/problem";
import {NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffToTypeString, PlStuffTrue, PlStuffType} from "./stuff";
import {natives} from "./native/native";
import {ScrambleFunction} from "./scrambler";
import {PlProblemCode} from "../../problem/codes";
import {NewFileInfo} from "../../compiler/lexing/info";
import {PlConverter} from "./native";

export interface PlStreamInout {
    output: (message: string) => void;
    input: (message: string) => string | null;
}

export class PlStackMachine {
    readonly stream: PlStreamInout;

    outerStackFrame: PlStackFrame;
    stack: PlStuff[];

    debug: PlDebugProgram;
    problems: PlProblem[];

    constructor(stream: PlStreamInout) {
        this.stream = stream;
        this.problems = [];

        this.outerStackFrame = new PlStackFrame(null);
        this.stack = [];

        this.seedStack();
    }

    seedStack() {
        const native = {
            [ScrambleFunction("output")]: (...message: any) => {
                this.stream.output(message.join(' '));
                return null;
            },
            ...natives,
        };

        for (const [key, entry] of Object.entries(native)) {
            this.outerStackFrame.createValue(
                key,
                PlConverter.JsToPl(entry)
            );
        }
    }

    peekStack(degree: number = 0): PlStuff | null {
        const index = this.stack.length - 1 - degree;
        if (index < 0)
            return null;
        return this.stack[index];
    }

    pushStack(stuff: PlStuff) {
        this.stack.push(stuff);
    }

    popStack(): PlStuff {
        return this.stack.pop();
    }

    newProblem(code: Record<string, PlProblemCode> | PlProblemCode, line: number, debugs?: PlDebugProgram, ...args: string[]) {
        if (!debugs) {
            return;
        }

        let surrounding: PlDebug = null;
        for (const debug of debugs) {
            if (line <= debug.endLine && line >= (debug.endLine - debug.length)) {
                if (surrounding == null) {
                    surrounding = debug;
                } else if (debug.length < surrounding.length) {
                    surrounding = debug;
                }
            }
        }

        if (surrounding == null) {
            this.problems.push(NewPlProblem("RE0002", NewFileInfo(0, 0, 0, ''), '' + line));
            return;
        }

        if (typeof code == "string") {
            this.problems.push(NewPlProblem(code, surrounding.span.info, ...args));
            return;
        }

        if (surrounding.name in code) {
            this.problems.push(NewPlProblem(code[surrounding.name], surrounding.span.info, ...args));
            return;
        }

        if ("*" in code) {
            this.problems.push(NewPlProblem(code["*"], surrounding.span.info, ...args));
            return;
        }

        this.problems.push(NewPlProblem("RE0002", NewFileInfo(0, 0, 0, ''), '' + line));
    }

    getProblems() {
        return this.problems;
    }

    runProgram(program: PlProgram, debug?: PlDebugProgram): boolean {
        /// WE ASSUME THAT THE PROGRAM IS VALID AND ONLY HANDLE RUNTIME ERRORS HERE NOT JS EXCEPTIONS

        let ptr = 0;
        while (ptr < program.length) {
            const byte = program[ptr];
            switch (byte.type) {
                case PlBytecodeType.STKPOP: {
                    this.popStack();
                    break;
                }
                case PlBytecodeType.DEFNUM: {
                    this.pushStack(NewPlStuff(PlStuffType.NUMBER, +byte.value));
                    break;
                }
                case PlBytecodeType.DEFSTR: {
                    this.pushStack(NewPlStuff(PlStuffType.STRING, byte.value));
                    break;
                }
                case PlBytecodeType.DEFBOL: {
                    if (byte.value == '1')
                        this.pushStack(PlStuffTrue);
                    else
                        this.pushStack(PlStuffFalse);
                    break;
                }
                case PlBytecodeType.DEFNUL: {
                    this.pushStack(PlStuffNull);
                    break;
                }
                case PlBytecodeType.DEFTYP: {
                    this.pushStack(NewPlStuff(PlStuffType.TYPE, byte.value));
                    break;
                }
                case PlBytecodeType.DEFETY: {
                    this.pushStack(null);
                    break;
                }
                case PlBytecodeType.DEFVAR: {
                    let name = byte.value;

                    // try to find it in the stack frame
                    let value = this.outerStackFrame.findValue(name);
                    if (value != null) {
                        this.pushStack(value);
                        break;
                    }

                    // attempt to add type
                    const left = this.peekStack(1);
                    if (left != null) {
                        value = this.outerStackFrame.findValue(ScrambleFunction(name, left.type))
                        if (value != null) {
                            this.pushStack(value);
                            break;
                        }
                    }

                    this.newProblem({
                        "ASTVariable": "RE0003",
                        "ASTBinary": "RE0004",
                    }, ptr, debug, name, left ? PlStuffToTypeString(left.type) : undefined);
                    return false;
                }

                case PlBytecodeType.DONEGT: {

                }

                case PlBytecodeType.DOLNOT: {

                }

                case PlBytecodeType.DOCALL: {
                    const func = this.popStack();
                    const arity = this.popStack();
                    const args = [];

                    // trust this
                    for (let i = 0; i < +arity.value; ++i) {
                        args.push(this.popStack());
                    }

                    // call function
                    switch (func.type) {
                        case PlStuffType.NFUNCTION: {
                            this.pushStack(func.value.callback(...args));
                            break;
                        }
                    }

                    break;
                }

                case PlBytecodeType.DOFIND: {
                    break;
                }

                case PlBytecodeType.BLOCRT: {
                    const offset = +byte.value;
                    const block = program.slice(ptr, ptr + offset);
                    ptr += offset;
                    this.pushStack(NewPlStuff(PlStuffType.BLOCK, block));
                    break;
                }

                default: {
                    this.newProblem("RE0001", ptr, debug, '' + byte.type);
                    return false;
                }
            }
            ++ptr;
        }
        return true;
    }
}
