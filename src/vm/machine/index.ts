import { PlBytecodeType, PlProgram } from "../emitter/bytecode";
import { PlDebugProgram } from "../emitter/debug";
import { PlStackFrame } from "./memory";
import { PlProblem } from "../../problem/problem";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType } from "./stuff";
import { PlConverter } from "./native";
import { ARITY_SEP } from "../emitter";

export interface PlStreamInout {
    output: ( message: string ) => void;
    input: ( message: string ) => string | null;
}

export class PlStackMachine {
    readonly stream: PlStreamInout;

    outerStackFrame: PlStackFrame;
    stack: PlStuff[];

    problems: PlProblem[];

    constructor( stream: PlStreamInout ) {
        this.stream = stream;
        this.problems = [];

        this.outerStackFrame = new PlStackFrame( null );
        this.stack = [];

        this.seedStack();
    }

    seedStack() {
        const native = {
            "output/1": this.stream.output
        };

        for (const [key, entry] of Object.entries(native)) {
            this.outerStackFrame.createValue(
                key,
                PlConverter.JsToPl(entry)
            );
        }
    }

    peekStack() {
        return this.stack[this.stack.length-1];
    }

    pushStack( stuff: PlStuff ) {
        this.stack.push( stuff );
    }

    popStack(): PlStuff {
        return this.stack.pop();
    }

    runProgram( program: PlProgram, debug?: PlDebugProgram ) {
        // start the stack machine
        for ( let ptr = 0; ptr < program.length; ++ptr ) {
            const byte = program[ptr];
            switch ( byte.type ) {
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
                    if (!!byte.value)
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
                    // find variables
                    let name = byte.value;
                    // try to find it
                    let value = this.outerStackFrame.findValue(name);
                    if (value != null) {
                        this.pushStack(value);
                        break;
                    }

                    // try adding suffix
                    const top = this.peekStack();
                    if (top.type == PlStuffType.NUMBER) {
                        value = this.outerStackFrame.findValue(`${name}${ARITY_SEP}${top.value}`);
                        if (value != null) {
                            this.pushStack(value);
                            break;
                        }
                    }

                    throw "Unimplemented";
                }

                case PlBytecodeType.DOCALL: {
                    const func = this.popStack();
                    const arity = this.popStack();
                    const args = [];
                    for (let i = 0; i < +arity.value; ++i) {
                        args.push(this.popStack());
                    }

                    // call function
                    switch ( func.type ) {
                        case PlStuffType.NFUNCTION: {
                            this.pushStack(func.value.callback(...args));
                            break;
                        }
                    }

                    break;
                    // throw "Unimplemented";
                }


                case PlBytecodeType.BLOCRT: {
                    const offset = +byte.value;
                    const block = program.slice(ptr, ptr + offset);
                    ptr += offset;
                    this.pushStack(NewPlStuff(PlStuffType.BLOCK, block));
                    break;
                }

                default: {
                    throw "Unknown bytecode";
                }
            }
        }
    }
}
