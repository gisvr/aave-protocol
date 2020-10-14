let fs = require("fs");


function ConvertToTable(data, callBack) {
    data = data.toString();
    let table = new Array();
    let rows = new Array();
    rows = data.split("\r\n");
    for (var i = 0; i < rows.length; i++) {
        table.push(rows[i].split(","));
    }
    callBack(table);
}

function ConvertToMap(data, callBack) {
    data = data.toString();
    let table = new Array();
    let rows = new Array();
    rows = data.split("\r\n");
    let Obj = rows[0].split(",")
    for (var i = 1; i < rows.length-1; i++) {
        let info = rows[i].split(",")
        let _obj={}
        Obj.map((val,index)=>{
            _obj[val]=info[index]
        })
        table.push(_obj);
    }
    callBack(table);
}

module.exports = async (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, function (err, data) {
            if (err) {
                // console.log(err.stack);
                reject(err);
            }
            ConvertToMap(data, function (table) {
                // console.log(table);
                resolve(table)
            })
        });
    })
}

