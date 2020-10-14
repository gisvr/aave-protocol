const tokenTable = require("../utils/readCsv")
tokenTable().then(tokenInfo => {
    console.dir(tokenInfo)
})