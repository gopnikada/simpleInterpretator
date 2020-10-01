function parseExpression(program) {
    program = skipSpace(program);
    var match, expr;
    //console.log('beginning match' + match)
    if (match = /^"([^"]*)"/.exec(program))
   { //console.log('match in 1st if is '+match)
      expr = {type: "value", value: match[1]};}
    else if (match = /^\d+\b/.exec(program))
    
      {//console.log('match in 2nd if is '+match)
        expr = {type: "value", value: Number(match[0])}
      }//10
    else if (match = /^[^\s(),"]+/.exec(program))
    {//console.log('match in 3rd if is '+match)
      expr = {type: "word", name: match[0]};}//+
    else
      throw new SyntaxError("Неожиданный синтаксис: " + program);
  //console.log('match is '+match)
    return parseApply(expr, program.slice(match[0].length));
  }
  
  function skipSpace(string) {
    var first = string.search(/\S/);
    if (first == -1) return "";
    return string.slice(first);
  }

  function parseApply(expr, program) {
    program = skipSpace(program);
    if (program[0] != "(")
      return {expr: expr, rest: program};
  
    program = skipSpace(program.slice(1));
    expr = {type: "apply", operator: expr, args: []};//parse expr
    while (program[0] != ")") {
      var arg = parseExpression(program);
      expr.args.push(arg.expr);
      program = skipSpace(arg.rest);
      if (program[0] == ",")
        program = skipSpace(program.slice(1));
      else if (program[0] != ")")
        throw new SyntaxError("Ожидается ',' or ')'");
    }
    //console.log('i')
    return parseApply(expr, program.slice(1));
  }
  function parse(program) {
    var result = parseExpression(program);
    if (skipSpace(result.rest).length > 0)
      throw new SyntaxError("Неожиданный текст после программы");
    return result.expr;
  }
  
  function evaluate(expr, env) {//interpretator
    switch(expr.type) {
      case "value":
        return expr.value;
  
      case "word":
        if (expr.name in env)
          return env[expr.name];
        else
          throw new ReferenceError("Неопределённая переменная: " +
                                   expr.name);
      case "apply":
        if (expr.operator.type == "word" &&
            expr.operator.name in specialForms)
          return specialForms[expr.operator.name](expr.args,
                                                  env);
        var op = evaluate(expr.operator, env);
        if (typeof op != "function")
          throw new TypeError("Приложение не является функцией.");
        return op.apply(null, expr.args.map(function(arg) {
          return evaluate(arg, env);
        }));
    }
  }
  
  var specialForms = Object.create(null);


  specialForms["if"] = function(args, env) { //if statement
    if (args.length != 3)
      throw new SyntaxError("Неправильное количество аргументов для if");
  
    if (evaluate(args[0], env) !== false)
      return evaluate(args[1], env);
    else
      return evaluate(args[2], env);
  };

  specialForms["while"] = function(args, env) {//while statement
    if (args.length != 2)
      throw new SyntaxError("Неправильное количество аргументов для while");
  
    while (evaluate(args[0], env) !== false)
      evaluate(args[1], env);
  
    // Поскольку undefined не задано в Egg,
    // за отсутствием осмысленного результата возвращаем false
    return false;
  };

  specialForms["do"] = function(args, env) {
    var value = false;
    args.forEach(function(arg) {
      value = evaluate(arg, env);
    });
    return value;
  };

  specialForms["define"] = function(args, env) {//=
    if (args.length != 2 || args[0].type != "word")
      throw new SyntaxError("Bad use of define");
    var value = evaluate(args[1], env);
    env[args[0].name] = value;
    return value;
  };


  //Environment
var topEnv = Object.create(null);

topEnv["true"] = true;
topEnv["false"] = false;


var prog = parse("if(true, false, true)"); 
console.log(evaluate(prog, topEnv)); // → false
  //console.log(parse("+(a, 10)"));


  ["+", "-", "*", "/", "==", "<", ">"].forEach(function(op) {       //Arithm
    topEnv[op] = new Function("a, b", "return a " + op + " b;");
  });

  topEnv["print"] = function(value) { //print
    console.log(value);
    return value;
  };

  function run() {
    var env = Object.create(topEnv);
    var program = Array.prototype.slice
      .call(arguments, 0).join("\n");
    return evaluate(parse(program), env);
  }
 
    specialForms["fun"] = function(args, env) {//function
        if (!args.length)
          throw new SyntaxError("Функции нужно тело");
        function name(expr) {
          if (expr.type != "word")
            throw new SyntaxError("Имена аргументов должны быть типа word");
          return expr.name;
        }
        var argNames = args.slice(0, args.length - 1).map(name);
        var body = args[args.length - 1];
      
        return function() {
          if (arguments.length != argNames.length)
            throw new TypeError("Неверное количество аргументов");
          var localEnv = Object.create(env);
          for (var i = 0; i < arguments.length; i++)
            localEnv[argNames[i]] = arguments[i];
          return evaluate(body, localEnv);
        };
      };

      run("do(define(total, 0),",
      "   define(count, 1),",
      "   while(<(count, 11),",
      "         do(define(total, +(total, count)),",
      "            define(count, +(count, 1)))),",
      "   print(total))");

      run("do(define(plusOne, fun(a, +(a, 1))),",
    "   print(plusOne(10)))");
// → 11

run("do(define(pow, fun(base, exp,",
    "     if(==(exp, 0),",
    "        1,",
    "        *(base, pow(base, -(exp, 1)))))),",
    "   print(pow(2, 10)))");