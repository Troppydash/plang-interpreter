import {PlProgramWithDebug} from "./emitter";
import {BytecodeToString, PlProgram} from "./bytecode";
import {PlDebugToString} from "./debug";

export function ProgramWithDebugToString(program: PlProgramWithDebug): string {
    let bytecodes = ProgramToString(program.program).split('\n');

    // pad bytecode
    let max = Number.MIN_VALUE;
    bytecodes.forEach(bc => {
        let length = bc.length;
        if (length > max)
            max = length;
    })
    bytecodes = bytecodes.map(bc => {
        return bc + ' '.repeat(max - bc.length) + ' #';
    });


    // append debug information
    for (const debug of program.debug) {
        const {endLine, length, name} = debug;
        const startLine = endLine - length;

        // get max lines length
        let max = Number.MIN_VALUE;
        for (let i = 0; i < length; ++i) {
            let length = bytecodes[startLine + i].length;
            if (length > max)
                max = length;
        }

        const append = ` + ${PlDebugToString(debug)}`;
        const remain = ' |' + ' '.repeat(append.length - 2);

        // add lines
        bytecodes[startLine] += ' '.repeat(max - bytecodes[startLine].length) + append;
        for (let i = 1; i < length; ++i) {
            let length = bytecodes[startLine + i].length;
            bytecodes[startLine + i] += ' '.repeat(max - length) + remain;
        }
    }
    return bytecodes.join('\n');
}

export function ProgramToString(program: PlProgram): string {
    const out = [];
    for (const bc of program) {
        out.push(BytecodeToString(bc));
    }
    return out.join('\n');
}