import {GenerateGuardedFunction} from "../helpers";
import {PlStuff, PlStuffType} from "../../stuff";
import inout from "../../../../inout";


export const system = {
    read: GenerateGuardedFunction("read", [PlStuffType.Str], (dir: string) => {
        const fs = require('fs');
        const path = require('path');
        try {
            const data = fs.readFileSync(path.join(inout.paths.rootPath, dir));
            return {
                text: data.toString(),
                ok: true,
            }
        } catch (e) {
            return {
                text: e.toString(),
                ok: false
            }
        }
    }),
    write: GenerateGuardedFunction("read", [PlStuffType.Str, PlStuffType.Str], (dir: string, content: string) => {
        const fs = require('fs');
        const path = require('path');
        try {
            fs.writeFileSync(path.join(inout.paths.rootPath, dir), content);
            return {
                text: content,
                ok: true,
            }
        } catch (e) {
            return {
                text: e.toString(),
                ok: false
            }
        }
    }),
};
