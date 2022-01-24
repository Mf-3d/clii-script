const cliinode = require('./module');
const fs = require('fs')

var code = fs.readFileSync('./main.clii',"utf-8");

cliinode.run_clii(code);