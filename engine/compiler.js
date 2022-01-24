exports.compile = function(ast,filename){
  var basefile = filename.slice(0,-2);
  var asmfile = basefile + ".s";
  var objfile = basefile + ".o";
  var exefile = basefile;
  //アセンブラコード出力用元情報
  var strs = []//文字列定数
  var nums = [];//数値定数
  var globals = []//グローバル変数
  var types = {};//実数か文字列かの判定
  var codes = [];//コード生成
  //------ASTからコード生成元情報作成(ASTを深さ優先探索しながらアセンブリ出力)------//
  function gen(ast){
    //配列は各要素を評価して、配列で返す。
    if(Array.isArray(ast)) return ast.map(e=>gen(e));
    if(ast.op){//演算子あり
      if(ast.op == '='){
	//グローバル変数に登録されていなかったら登録する。
	if(!globals.includes(ast.left)) globals.push(ast.left);
	var type = types[ast.left] = gen(ast.right);//数値/文字列どっち代入？
	if(type == 1){//実数
	  codes.push("pop0");
	  codes.push("movsd "+ast.left+",xmm0\n");
	}else{
	  codes.push("pop rax");
	  codes.push("mov "+ast.left+",rax\n");
	}
	return 0;
      }
      if(ast.op == '()'){
	if(ast.left == "print"){
	  (Array.isArray(ast.right)?ast.right:[ast.right]).forEach(a=>{
	    if(gen(a)==1){
	      codes.push("pop0");
	      codes.push("printd");
	    }else{
	      codes.push("pop rsi");
	      codes.push("prints");
	    }
	  });
	}
	codes.push("printn\n");
	return 0;
      }
      //数値計算
      if(ast.op == '*'){
	gen(ast.left);
	gen(ast.right);
	codes.push("pop10");
	codes.push("mulsd xmm0,xmm1");
	codes.push("push0");
	return 1;//数値を意味する
      }
      if(ast.op == '/'){
	gen(ast.left);
	gen(ast.right);
	codes.push("pop10");
	codes.push("divsd xmm0,xmm1");
	codes.push("push0");
	return 1;//数値を意味する
      }
      if(ast.op == '-'){
	gen(ast.left);
	gen(ast.right);
	codes.push("pop10");
	codes.push("subsd xmm0,xmm1");
	codes.push("push0");
	return 1;//数値を意味する
      }
      if(ast.op == '+'){
	var type = gen(ast.left);
	gen(ast.right);
	if(type == 1){
	  codes.push("pop10");
	  codes.push("addsd xmm0,xmm1");
	  codes.push("push0");
	  return 1;//数値を意味する
	}else{
	  //文字列連結
	  codes.push("pop rsi");
	  codes.push("pop rdi");
	  codes.push("call newcat");
	  codes.push("push rax\n");
	  return 0;//文字列
	}
      }
    }
    //演算子ないなら、バリューにする
    if(globals.includes(ast)){//定義済み変数だったら
      if(types[ast]==1){//実数が代入されている
	codes.push("movsd xmm0,["+ast+"]");
	codes.push("push0");
	return 1;
      }else{
	codes.push("mov rax,"+ast);
	codes.push("push rax\n");
	return 0;
      }
      return 0;
    }
    if(ast[0]=='"'){
      if(!strs.includes(ast)) strs.push(ast);//文字列定数として登録
      codes.push("lea rax,[.s"+strs.length+"]");//文字列シンボル名ならlea
      codes.push("push rax\n");
      return 0;//数値以外を意味する
    }
    if(typeof ast == "number") return ast;
    if(ast[0].match(/^\d+$/)){
      if(!nums.includes(ast)) nums.push(ast);//数値定数として登録
      codes.push("movsd xmm0, .d"+ast);//シンボル名
      codes.push("push0");
      return 1;//数値を意味する
    }
    return 0;
  }
  //アセンブリコード生成
  gen(ast);
  asmgen();
  function asmgen(){
    var asm=`
       .intel_syntax noprefix
       .global _start
    `;
    //マクロ定義：x64のxmmレジスタにはpush/popがない。
    asm +=`
       .macro push0
         enter 8,0
         movsd [rsp],xmm0 #push left push result
       .endm
       .macro pop0
         movsd xmm0,[rsp] # pop left
         leave
       .endm
       .macro pop10
         movsd xmm1,[rsp] # pop right
         leave
         movsd xmm0,[rsp] # pop left
         leave
       .endm
         .printf.s: .string "%s"
         .printf.g: .string "%g"
         .newline: .string "\\n"
       .macro prints
         lea rdi,[.printf.s]
         call printf
       .endm
       .macro printn
         lea rdi,[.newline]
         call printf
       .endm
       .macro printd   
         lea rdi,[.printf.g]
         call printf
       .endm
    `;
    //文字列連結ライブラリ
    asm +=`
       #別メモリを確保して連結する
       newcat:
         # rax(連結後の新メモリ <---- rdi(str1),rsi(str2))
         enter 32,0 # str1,str2,合計サイズ,新しいメモリ
         mov [rsp],rdi # str2
         mov [rsp+8],rsi #str1
         movq [rsp+16],1 # 合計サイズ(最後のnull分の1)
         call strlen # str1の長さ
         add [rsp+16],rax # str1の長さを足す
         mov rdi,[rsp+8]
         call strlen # str2の長さ
         add [rsp+16],rax # str2の長さを足す
         mov rdi,1024
         call malloc
         mov [rsp+24],rax # 新メモリ
         #lea rax,[rsp+24]
         #movb [rax],0  #先頭nullを代入
         mov rdi,[rsp+24]
         mov rsi,[rsp]
         call strcat
         mov rdi,[rsp+24]
         mov rsi,[rsp+8]
         call strcat
         mov rax,[rsp+24] # 新メモリを返す
         leave
         ret
    `;
    //文字列定数
    strs.forEach((s,i)=>asm+=".s"+(i+1)+": .string "+s+"\n");
    //数値定数
    nums.forEach(n=>asm+=".d"+n+": .double "+n+"\n");
    //グローバル変数
    globals.forEach(g=>asm+=".comm "+g+",8\n");
    asm += "\n_start:\n";
    //メインコードを出力
    codes.forEach(c=>asm+="  "+c+"\n");
    //終了処理
    asm += "  mov rdi,0\n  call exit\n";
    //-------------アセンブリ言語のコード生成(テキスト)-----------//
    require("fs").writeFileSync(asmfile,asm);
  }
  exec=c=>require("child_process").execSync(c);//外部コマンド実行用
  //------アセンブラ(asコマンド)で、アセンブリをオブジェクトへ---------//
  exec("as "+asmfile+" -o "+objfile);
  //------リンカ(ldコマンド)で、オブジェクトを実行ファイルへ------//
  exec("ld --dynamic-linker /lib64/ld-linux-x86-64.so.2 -lc -o "+exefile +" "+ objfile);
  //exec("rm -f " + asmfile +" "+ objfile);
}