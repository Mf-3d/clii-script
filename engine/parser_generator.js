exports.parser_generator = function(rules){
  //ここでパーサを返している(このreturn functionがパーサジェネレータ)
  return function parser(t,p=0){
    if(p==rules.length) return t.shift();//最上位ならそのまま返す
    var z = rules[p]&&rules[p].z?rules[p].z:0;//優先度pの処理方法
    var ops = rules[p]&&rules[p].ops;//優先度pの演算子の配列
    if([1,2].includes(z)){//配列で格納する
      var left = parser(t,p+1);//丸投げ
      var list = [left];
      while((z == 1 && t.length > 0 )||(z == 2 && ops.includes(t[0])) ){
	if(z == 2) var op = t.shift();
	var right = parser(t,p+1);
	if(right) list.push(right);//配列にしておく
      }
      return list.length>1? list: left;
    }else if([3,4,5].includes(z)){//オブジェクトで格納(イレギュラー版)
      if ( z ==4 ) var left = parser(t,p+1);//丸投げ=関数名
      while(ops.includes(t[0])){
	var op = t.shift();//符号のプラスマイナス
	var right = parser(t,z==3?p+1:2);//丸投げ
	if(z!=3) op += t.shift();//カッコ)
	if(z!=4) return z==5?right:{left:"0",op,right};//単項演算子を二項演算子化
	left = {left,op,right};
      }
      return z==4?left:parser(t,p+1);//ここがleftでなくparser
    }else{//オブジェクトで格納する（通常版）
      var left = parser(t,p+1);
      while(ops.includes(t[0])) left = {left,op:t.shift(),right:parser(t,p+1)};
      return left;
    }
  }
}