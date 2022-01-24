const lexer = require('./engine/lexer');
const parser_generator = require('./engine/parser_generator');
const runast = require('./engine/ast');
const compiler = require('./engine/compiler');

var rules = [
  {z:1,ops:[]},//セミコロン省略演算子
  {z:2,ops:[";"]},//セミコロン演算子
  {z:2,ops:[","],},//カンマ演算子
  {ops:["="]},//代入演算子
  {ops:["+","-"]},//二項演算子(加減算)
  {ops:["*","/"]},//乗算、除算演算子
  {z:3,ops:["+","-"]},//単項演算子(符号から始まる)
  {z:4,ops:["("]},//二項演算子(関数呼び出し)
  {z:5,ops:["("]},//前置単項演算子(カッコから始まる)
];

module.exports = {
    run_clii : function (code) {
        var tokens = lexer.lexer(code);
        var parser = parser_generator.parser_generator(rules);
        var ast = parser(tokens);
        runast.runAST(ast);
    }
}