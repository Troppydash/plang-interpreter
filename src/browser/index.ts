// browser compiler

import {RunFile, RunVM} from "../linking";
import {NewPlFile} from "../inout/file";
import {PlStackMachine} from "../vm/machine";
import inout from "../inout";


const filename = "browser";
const attribute = "application/plang";


function getSources() : string[] {
    return Array.from(document.querySelectorAll(`script[type="${attribute}"]`)).map((node: any) => node.innerText);
}

const sources = getSources();
const vm = new PlStackMachine({
    ...inout,
    print: message => {
        inout.print(message);
        inout.flush();
    }
}, []);
for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const fn = `${filename}${i+1}`;
    const code = RunFile(NewPlFile(fn, source), vm);
    console.log(`[${fn}] return code: ${code}`);
    if (code !== 0) {
        break;
    }
}
