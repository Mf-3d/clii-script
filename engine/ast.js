const fs = require('fs');
const { exec } = require('child_process');

exports.runAST = function(ast){
  //組み込みライブラリprint関数
  var libs = {
    print:a=>console.log(Array.isArray(a)?a.join(""):a),
    readfile:a=>fs.readFileSync(Array.isArray(a)?a.join(""):a,"utf-8"),
    run_clii:a=>{
      var src = fs.readFileSync(Array.isArray(a)?a.join(""):a,"utf-8");
      require("../module").run_clii(src);
    },
    run_js:a=>exec(`node '${a}'`)
  };
  var env = {};//インタプリタ用グローバル変数置き場
  //ASTを実行する
  return run(ast);
  function run(ast){
    //配列は各要素を評価して、配列で返す。
    if(Array.isArray(ast)) return ast.map(e=>run(e));
    if(ast.op){//演算子あり
      if(ast.op == '=') return env[ast.left] = run(ast.right);
      if(ast.op == '()') return libs[ast.left](run(ast.right));
      if(ast.op == '*') return run(ast.left) * run(ast.right);
      if(ast.op == '/') return run(ast.left) / run(ast.right);
      if(ast.op == '+') return run(ast.left) + run(ast.right);
      if(ast.op == '-') return run(ast.left) - run(ast.right);
    }
    //演算子ないなら、バリューにする
    if(ast[0]=='"') return ast.slice(1,-1);//「""」を捨てる
    if(ast[0]=="'") return ast.slice(1,-1);//「''」を捨てる
    if(ast[0].match(/^\d+/)) return 1 * ast;//文字→数字
    return env[ast];//定義済み変数なら値を返す。
  }
}