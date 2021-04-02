// const readline = require('readline');
// const stream = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// })
const prompt = require( 'prompt-sync' )();

export function print( message ) {
    console.log( message );
}

export function input( message ) {
    return prompt(message);
}

