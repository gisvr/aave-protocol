let fs = require("fs");


let convertToMap = (data) => {

    let table = new Array();
    let rows = data.split("\r\n");
    let header = rows[0].split(",")
    for (let i = 1; i < rows.length - 1; i++) {
        let info = rows[i].split(",")
        let _obj = {}
        header.map((val, index) => {
            _obj[val] = info[index]
        })
        table.push(_obj);
    }
    return table;
}

module.exports = (path) => {
    let data = fs.readFileSync(path)
    return convertToMap(data.toString())
}

