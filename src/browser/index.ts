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

// https://stackoverflow.com/questions/9899372/pure-javascript-equivalent-of-jquerys-ready-how-to-call-a-function-when-t
function ready(fn) {
    if (document.readyState != 'loading'){
        fn();
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        (document as any).attachEvent('onreadystatechange', function() {
            if (document.readyState != 'loading')
                fn();
        });
    }
}

ready(() => {
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
        console.debug(`[${fn}] sync return code: ${code}`);

        if (code !== 0) {
            break;
        }
    }
})
