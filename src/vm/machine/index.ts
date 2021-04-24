import { PlBytecode, PlBytecodeType, PlProgram } from "../emitter/bytecode";
import { PlDebug, PlDebugProgram } from "../emitter/debug";
import { PlStackFrame } from "./memory";
import { NewPlProblem, PlProblem } from "../../problem/problem";
import { NewPlStuff, PlStuff, PlStuffFalse, PlStuffNull, PlStuffTrue, PlStuffType } from "./stuff";
import { natives } from "./native/native";
import { ARITY_SEP } from "../emitter";
import { ScrambleFunction } from "./scrambler";
import { PlProblemCode } from "../../problem/codes";
import { NewFileInfo } from "../../compiler/lexing/info";
import { PlConverter } from "./native";

export interface PlStreamInout {
    output: ( message: string ) => void;
    input: ( message: string ) => string | null;
}

export class PlStackMachine {
    readonly stream: PlStreamInout;

    outerStackFrame: PlStackFrame;
    stack: PlStuff[];

    debug: PlDebugProgram;
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
            [ScrambleFunction( "output", 1 )]: ( message: any ) => {
                this.stream.output( message );
                return null;
            },
            ...natives,
        };

        for ( const [ key, entry ] of Object.entries( native ) ) {
            this.outerStackFrame.createValue(
                key,
                PlConverter.JsToPl( entry )
            );
        }
    }

    peekStack( degree: number = 0 ): PlStuff | null {
        const index = this.stack.length - 1 - degree;
        if ( index < 0 )
            return null;
        return this.stack[index];
    }

    pushStack( stuff: PlStuff ) {
        this.stack.push( stuff );
    }

    popStack(): PlStuff {
        return this.stack.pop();
    }

    newProblem( code: PlProblemCode, line: number, debugs?: PlDebugProgram, ...args: string[]) {
        if (!debugs) {
            return;
        }

        let surrounding = null;
        for ( const debug of debugs ) {
            if (line <= debug.endLine && line >= (debug.endLine-debug.length)) {
                if (surrounding == null) {
                    surrounding = debug;
                } else if (debug.length < surrounding.length) {
                    surrounding = debug;
                }
            }
        }
        if (surrounding == null) {
            this.problems.push(NewPlProblem("RE0001", NewFileInfo(0, 0, 0, '')));
        } else {
            this.problems.push( NewPlProblem(code, surrounding.span.info, ...args));
        }
    }

    getProblems() {
        return this.problems;
    }

    runProgram( program: PlProgram, debug?: PlDebugProgram ): boolean {
        /// WE ASSUME THAT THE PROGRAM IS VALID AND ONLY HANDLE RUNTIME ERRORS HERE NOT JS EXCEPTIONS

        let ptr = 0;
        while ( ptr < program.length ) {
            const byte = program[ptr];
            switch ( byte.type ) {
                case PlBytecodeType.STKPOP: {
                    this.popStack();
                    break;
                }
                case PlBytecodeType.DEFNUM: {
                    this.pushStack( NewPlStuff( PlStuffType.NUMBER, +byte.value ) );
                    break;
                }
                case PlBytecodeType.DEFSTR: {
                    this.pushStack( NewPlStuff( PlStuffType.STRING, byte.value ) );
                    break;
                }
                case PlBytecodeType.DEFBOL: {
                    if ( !!byte.value )
                        this.pushStack( PlStuffTrue );
                    else
                        this.pushStack( PlStuffFalse );
                    break;
                }
                case PlBytecodeType.DEFNUL: {
                    this.pushStack( PlStuffNull );
                    break;
                }
                case PlBytecodeType.DEFTYP: {
                    this.pushStack( NewPlStuff( PlStuffType.TYPE, byte.value ) );
                    break;
                }
                case PlBytecodeType.DEFETY: {
                    this.pushStack( null );
                    break;
                }
                case PlBytecodeType.DEFVAR: {
                    let name = byte.value;

                    // try to find it in the stack frame
                    let value = this.outerStackFrame.findValue( name );
                    if ( value != null ) {
                        this.pushStack( value );
                        break;
                    }

                    // attempt to add arity and type
                    const top = this.peekStack();
                    if ( top != null && top.type == PlStuffType.NUMBER ) {
                        value = this.outerStackFrame.findValue( `${name}${ARITY_SEP}${top.value}` );
                        if ( value != null ) {
                            this.pushStack( value );
                            break;
                        }
                        const left = this.peekStack( 1 );
                        if ( left != null ) {
                            value = this.outerStackFrame.findValue( ScrambleFunction( name, top.value, left.type ) )
                            if ( value != null ) {
                                this.pushStack( value );
                                break;
                            }
                        }
                    }

                    this.newProblem("RE0002", ptr, debug, name);
                    return false;
                }

                case PlBytecodeType.DOCALL: {
                    const func = this.popStack();
                    const arity = this.popStack();
                    const args = [];
                    for ( let i = 0; i < +arity.value; ++i ) {
                        args.push( this.popStack() );
                    }

                    // call function
                    switch ( func.type ) {
                        case PlStuffType.NFUNCTION: {
                            this.pushStack( func.value.callback( ...args ) );
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
                    const block = program.slice( ptr, ptr + offset );
                    ptr += offset;
                    this.pushStack( NewPlStuff( PlStuffType.BLOCK, block ) );
                    break;
                }

                default: {
                    this.newProblem("RE0001", ptr, debug, ''+byte.type);
                    return false;
                }
            }
            ++ptr;
        }
        return true;
    }
}
