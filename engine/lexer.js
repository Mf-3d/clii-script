exports.lexer = function (filename) {
  var source = filename;
  source = source.replace(/^#!.*?\n/,"");
  return source.split(/\/\/.*$|(".*?"|\d+(?:\.\d+){0,1}|\w+)|\s|(.)/m).filter(a=>a);
}