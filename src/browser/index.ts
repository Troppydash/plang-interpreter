// browser compiler

import {RunFile, RunVM} from "../linking";
import {NewPlFile, PlFile} from "../inout/file";
import {PlStackMachine} from "../vm/machine";
import {Inout} from "../inout";
import {execute} from "./compiler";
import * as useful from './exports';

const attribute = "application/devia";

async function getSources(): Promise<PlFile[]> {
    const nodes = Array.from(document.querySelectorAll(`script[type="${attribute}"]`));
    const out: PlFile[] = [];
    let i = 0;
    for (const node of nodes) {
        i++;
        const src = node.getAttribute('src');
        if (src != null) {
            try {
                const path = window.location.pathname.split('/');
                path.pop()
                const data = await fetch(`${window.location.origin+path.join('/')}/${src}`);
                if (!data.ok) {
                    throw null;
                }
                const text = await data.text();
                out.push(NewPlFile(src, text));
                console.debug(`loaded external script '${src}'`);
            } catch (e) {
                alert(`there is no file called ${src}\nhalting devia interpreter...`);
                return [];
            }
        } else {
            out.push(NewPlFile(`browser${i}`, (node as any).innerText));
        }
    }
    return out;
}

// https://stackoverflow.com/questions/9899372/pure-javascript-equivalent-of-jquerys-ready-how-to-call-a-function-when-t
function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        (document as any).attachEvent('onreadystatechange', function () {
            if (document.readyState != 'loading')
                fn();
        });
    }
}

export function ExecuteBrowserTags() {
    ready(async () => {
        const sources = await getSources();
        const vm = new PlStackMachine({
            ...Inout(),
            print: (message, end) => {
                Inout().print(message, end);
                Inout().flush();
            }
        }, NewPlFile('browser.de', ''), []);
        for (const source of sources) {
            const code = RunFile(vm, source);
            console.debug(`[${source.filename}] sync return code: ${code}`);

            if (code !== 0) {
                break;
            }
        }
    })
}
export function Inject(obj: any = null) {
    if (obj == null) {
        return Inject(useful);
    }

    let win = window as any;
    win.data = {
        ...win.data,
        exports: {
            ...(win.data || {}).exports,
            ...obj
        }
    };
}
export const Execute = execute;
export const Useful = useful;
