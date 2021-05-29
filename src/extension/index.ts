import { isalphanum } from "./types";


// https://stackoverflow.com/questions/66426053/typescript-is-there-a-union-of-string-literal-types-for-the-output-of-typeof
const x: any = "";
const t = typeof x;
export type TypeofTypes = typeof t;
