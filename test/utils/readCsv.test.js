let tokenTable = require("../../utils/readCsv")

let tokenConfPath = "../../config/token-config.csv"
let res = tokenTable(tokenConfPath)
console.log(res)