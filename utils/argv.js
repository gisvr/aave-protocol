module.exports = require('yargs')
    .usage('\nUsage: $0 <cmd> [args]')
    .example('$0 -c "BTC" -m "tag volcano eight thank tide" -l pri')
    .epilog('copyright 2022')
    .alias({
        a: 'account',
        c: 'contract',
        t: 'token',
        n: "network",
        f: "function",
        h: "help"
    }).default({
        c: "mint",
        a: "0x9F7A946d935c8Efc7A8329C0d894A69bA241345A"
    }).string(["f","a"])
    .argv