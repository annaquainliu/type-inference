// page 405 : Expression evaluations
// page 421 : Type Inference Rules

function main() {
    // page 404 : nml expressions
    const input = document.getElementById("code");
    const interpretButton = document.getElementById("interpret")
    interpretButton.addEventListener("click", () => {
        let parser = new Parser();
        let exp = parser.tokenInput(input.value);
        console.log(exp);
    });
}

// main();

class Parser {
    queue = [];

    tokenInput(input) {
        input = input.replaceAll("[", "(")
        input = input.replaceAll("]", ")")
        input = input.split("(").join(" ").split(" ");
        input = input.filter(word => word != "" && word != " ");
        input = input.map(item => item.toLowerCase());
        this.queue = [];
        for (let i = 0; i < input.length; i++) {
            let word = input[i];
            let lastIndex = 0;
            let bracketStr = false;
            if (!word.includes(")")) {
                this.queue.push(word);
                continue;
            }
            for (let j = 0; j < word.length; j++) {
                if (word[j] == ")" && !bracketStr) {
                    lastIndex = j;
                    bracketStr = true;
                }
                if (bracketStr && word[j] != ")" || (bracketStr && j == word.length - 1)) {
                    bracketStr = false;
                    let brackets = Array(j - lastIndex + 1).fill(")");
                    word = word.substring(0, lastIndex) + word.substring(j + 1);
                    if (word != "" && word != " ") {
                        this.queue.push(word);
                    }
                    this.queue = this.queue.concat(brackets);
                }
            }
        }
        this.queue = this.queue.reverse();
        console.log(this.queue);
        return this.tokenize(this.queue.pop());
    }

    /**
     * Tokenizes code written by user
     * 
     * @param {String} exp 
     * @returns {Expression} 
     */
    tokenize(exp) {
        if (exp == "if") {
            return new If(this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()));
        }
        else if (exp == "begin") {
            let item = this.queue.pop();
            let arr = []
            while (item != ")") {
                arr.push(this.tokenize(item));
                item = this.queue.pop();
            }
            return new Begin(arr);
        }
        else if (exp == "let") {
            return new Let(this.tokenLet());
        }
        else if (exp == "let*") {
            return new LetStar(this.tokenLet());
        }
        else if (exp == "letrec") {
            return new Letrec(this.tokenLet());
        }
        else if (exp == "lambda") {
            return this.tokenLambda();
        }
        else if (exp == "'") { // must be a list
            return this.tokenPair();
        }
        else if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (exp[0] == "'") {
            return new Sym(exp);
        }
        else if (/^-?\d+$/.test(exp)) { 
            return new Num(exp);
        } 
        return new Var(exp);
    }
   
    tokenPair() {
        let item = this.queue.pop();
        if (item == ")") {
            return new Nil();
        }
        return new Pair(this.tokenListLiterals(item), this.tokenPair());
    }

    tokenListLiterals(exp) {
        if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (/^-?\d+$/.test(exp)) {
            return new Num(exp);
        }
        return new Sym(exp);
    }

    //  [')', 'x', ')', ')', '3', 'x', 'let']
    tokenLet() {
        let bindings = this.tokenLetBindings();
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for last closing )
        return {"bindings": bindings, "exp" : exp};
    }

    tokenLetBindings() {
        if (this.queue[this.queue.length - 1] == ")") {
            this.queue.pop(); // for )
            return {};
        }
        let name = this.queue.pop();
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for closing )
        let obj = {};
        obj[name] = exp;
        return Object.assign(this.tokenLetBindings(), obj);
    }

    tokenLambda() {
        let params = [];
        let item = this.queue.pop();
        while (item != ")") {
            params.push(item);
            item = this.queue.pop();
        }
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for ending )
        return new Lambda(params, exp);
    }

}

///////////////////////////
//
//      CONSTRAINT SOLVING
//
//

// thetas!
class Substitution {

    static idsubst = new Substitution({});

    /**
     * mapsTo : creates a substitution with the type variable name and type
     * @param {String} name : type variable name
     * @param {Type} tau : type
     * @returns {Substitution}
     */
    static mapsTo(name, tau) {
        let map = {};
        map[name] = tau;
        return new Substitution(map);
    }

    /**
     * compose : Combine both substitutions
     * @param {Subtitution} theta1 
     * @param {Substitution} theta2 
     * @returns {Substitution} this
     */
    compose(theta2) {
        let keys = Object.keys(theta2.mapping);
        for (let key of keys) {
            this.mapping[key] = theta2.mapping[key];
        }
        return this;
    }

    /**
     * 
     * @param {Map<String, Type>} mapping
     */
    constructor(mapping) {
        this.mapping = mapping;
    }
}

// abstract class
/**
 * 'a ~ s /\ 'int ~ bool
 * 
 * {a |--> int}
 */
class Constraint {

    /**
     * @returns {Substitution}
     */
    solve() {}

    /**
     * Turns constraint into string, readable format
     * @returns {String}
     */
    toString() {}

     /**
     * Substitutes a substitution into the constraint
     * @param {Substitution} sub 
     * @returns {Constraint} : returns edited constraint that is solved
     */
    consubst(sub) { }

    /**
     * Conjoins this constraint with all of the constraints in cs
     * @param {Array<Constraint>} cs
     * @returns {Constraint}
     */
    conjoin(cs) {
        if (cs.length == 0) {
            return new And(this, new Trivial());
        }
        return new And(this, cs.pop().conjoin(cs));
    }
    
    /**
     * Conjoins all of the constraints in cs
     * @param {Array<Constraint>} cs
     */
    static conjoin(cs) {
        if (cs.length == 0) {
            return new Trivial();
        }
        return cs.pop().conjoin(cs);
    }
}


class Trivial extends Constraint {

    solve() {
        return Substitution.idsubst;
    }

    toString() {
        return "T";
    }
 
    consubst(sub) {return this;}

}

class And extends Constraint {

    /**
     * /\ constraint 
     * @param {Constraint} c1 
     * @param {Constraint} c2 
     */
    constructor(c1, c2) {
        super();
        this.c1 = c1;
        this.c2 = c2;
    }

    toString() {
        return this.c1.toString() + " /\\ " + this.c2.toString();
    }

    solve() {
        let theta1 = this.c1.solve();
        let theta2 = this.c2.consubst(theta1).solve();
        return theta1.compose(theta2);
    }

    consubst(sub) { 
        this.c1.consubst(sub);
        this.c2.consubst(sub);
        return this;
    }
}

class Equal extends Constraint {

    /**
     * ~ constraint 
     * @param {Type} tau1
     * @param {Type} tau2 
     */
    constructor(tau1, tau2) {
        super();
        this.tau1 = tau1;
        this.tau2 = tau2;
    }

    toString() {
        return this.tau1.typeString + " ~ " + this.tau2.typeString;
    }

    solve() {
        return this.tau1.solve(this.tau2);
    }

    /**
     * Constitutes a theta into the constraint
     * @param {Substitution} sub 
     */
    consubst(sub) {
        let keys = Object.keys(sub.mapping);
        for (let key of keys) {
            if (this.tau1.typeString == key) {
                this.tau1 = sub.mapping[key];
            }
            if (this.tau2.typeString == key) {
                this.tau2 = sub.mapping[key];
            }
        }
        return this;
    }
}

/**
 * 
 * 
 *  TYPES
 * 
 */
// type interface
class Type {

    constructor() {}

    static listtype(tau) {
        return new Conapp(new Tycon("list"), [tau]);
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {}

    /**
     * Solves any type ~ any type equality
     * @param {Type} tau 
     * @returns {Substitution}
     */
    solve(tau) { }
     /**
     * Solves tycon ~ tycon equality
     * @param {Tycon} tycon 
     * @returns {Substitution}
     */
     solveTycon(tycon) {}
 
     /**
      * Solves tycon ~ conapp equality
      * @param {Conapp} conapp 
      * @returns {Substitution}
      */
     solveConapp(conapp) {}
 
     /**
      * solves tycon ~ tyvar equality
      * @param {Tyvar} tyvar 
      * @returns {Substitution}
      */
     solveTyvar(tyvar) {}

}

class Tycon extends Type {
    
    static boolty = new Tycon("bool")
    static intty = new Tycon("int")
    static symty = new Tycon("sym")
    static unitty = new Tycon("unit")

    constructor(name) {
        super();
        this.name = name;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {
        return [];
    }

    get typeString() {
        return this.name;
    }

    /**
     * @returns {Substitution}
     * @returns {Substitution}
     * 
     * tycon ~ any tau 
     */
    solve(tau) {
        return tau.solveTycon(this);
    }

    /**
     * Solves tycon ~ tycon equality
     * @param {Tycon} tycon 
     * @returns {Substitution}
     */
    solveTycon(tycon) {
        if (tycon.typeString == this.typeString) {
            return Substitution.idsubst;
        }
        throw new Error(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves tycon ~ conapp equality
     * @param {Conapp} conapp 
     * @returns {Substitution}
     */
    solveConapp(conapp) {
        throw new Error(conapp.typeString + " cannot equal " + this.typeString);
    }

    /**
     * solves tycon ~ tyvar equality
     * @param {Tyvar} tyvar 
     * @returns {Substitution}
     */
    solveTyvar(tyvar) {
        let map = {};
        map[tyvar.typeString] = this;
        return new Substitution(map);
    }

}

class Tyvar extends Type {
    static tCounter = 0;
    count;

    constructor() {
        super();
        this.count = Tyvar.tCounter;
        Tyvar.tCounter++;
    }

    get typeString() {
        return "'t" + this.count;
    }

    static reset() {
        tCounter = 0;
    }
    
    /**
     * @returns {Array<Tyvar>} Array of free type variables
     * @returns {Substitution}
     */
    freetyvars() {
        return [this];
    }

    /**
     * @returns {Substitution}
     */
    solve(tau) {
        return tau.solveTyvar(this);
    }

    /**
     * Solves tyvar ~ tycon equality
     * @param {Tycon} tycon 
     */
    solveTycon(tycon) {
        return tycon.solveTyvar(this);
    }

    /**
     * Solves tyvar ~ conapp equality
     * 
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.freetyvars().includes(this)) {
            throw new Error(this.typeString + "occurs in " + conapp.typeString);
        }
        let map = {};
        map[this.typeString] = conapp;
        return new Substitution(map);
    }

    /**
     * solves tyvar ~ tyvar equality
     * @param {Tyvar} tyvar 
     */
    solveTyvar(tyvar) {
        let map = {};
        map[this.typeString] = tyvar;
        return new Substitution(map);
    }
}

class Conapp extends Type {

    /**
     * 
     * @param {Tycon} tycon 
     * @param {Array<Type>} types 
     */
    constructor (tycon, types) {
        super();
        this.tycon = tycon;
        this.types = types;
    }

    get typeString() {
        let str = "(" + this.tycon.typeString;
        for (let i = 0; i < this.types.length; i++) {
            str += " " + this.types[i].typeString;
        }
        str += ")";
        return str;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {
        let vars = [];
        for (let type of this.types) {
            vars = vars.concat(type.freetyvars());
        }
        return vars;
    }

    /**
     * @returns {Substitution}
     */
    solve(tau) {
        return tau.solveConapp(this);
    }

    /**
     * Solves conapp ~ tycon equality
     * @param {Tycon} tycon 
     */
    solveTycon(tycon) {
        throw new Error(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves conapp ~ conapp equality
     * 
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.types.length != this.types.length) {
            throw new Error(this.typeString + " ~ " + conapp.typeString + " have different length types array");
        }
        let bigConstraint = new Equal(this.tycon, conapp.tycon);
        for (let i = 0; i < conapp.types.length; i++) {
            bigConstraint = new And(bigConstraint, new Equal(conapp.types[i], this.types[i]));
        }
        return bigConstraint.solve();
    }

    /**
     * solves conapp ~ tyvar equality
     * @param {Tyvar} tyvar 
     */
    solveTyvar(tyvar) {
        return tyvar.solveConapp(this);
    }

}

class Forall extends Type {
    /**
     * Forall datatype constructor
     * @param {Array<Tyvar>} tyvars 
     * @param {Type} tau 
     */
    constructor(tyvars, tau) {
        super();
        this.tyvars = tyvars;
        this.tau = tau;
    }

    get typeString() {
        let str = "(forall [";
        for (let i = 0; i < this.tyvars.length; i++) {
            str += this.tyvars[i].typeString + " ";
        }
        str = str.slice(0, -1);
        str += (this.tyvars.length == 0 ? "" : "] ") + this.tau.typeString + ")";
        return str;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     *
     */
    freetyvars() {
        let generalized = this.tyvars;
        let tyvars = this.tau.freetyvars();
        let diff = [];
        for (let tyvar of tyvars) {
            if (!generalized.includes(tyvar)) {
                diff.push(tyvar);
            }
        }
        return diff;
    }

}

class Funty extends Conapp {

    /**
     * 
     * @param {Array<Type>} taus : Parameter types
     * @param {Type} tau : Return type
     */
    constructor(taus, tau) {
        super(new Tycon("function"), [new Conapp(new Tycon("arguments"), taus), tau]);
        this.taus = taus;
        this.tau = tau;
    }

    get typeString() {
        let str = "("
        for (let i = 0; i < this.taus.length; i++) {
            str += this.taus[i].typeString + " ";
        }
        str += "-> " + this.tau.typeString + ")";
        return str;
    }
}

/**
 * 
 * 
 * EXPRESSIONS
 * 
 * 
 */

// Expression Interface
class Expression {

    static Gamma = {}
    static Rho = {}

    constructor() {}
    /**
     * @returns {ExpEvalBundle}
     */
    eval() {}
}

class ExpEvalBundle {
    /**
     * 
     * @param {Object} val 
     * @param {Type} tau 
     * @param {Constraint} constraint 
     */
    constructor(val, tau, constraint) {
        this.val = val;
        this.tau = tau;
        this.constraint = constraint;
    }
}

// abstract class
class Literal extends Expression {

    value; // string
    constraint; // Constraint
    type; // Type

    // private constructor, not meant to be instantiated
    constructor() {
        super();
        this.constraint = new Trivial();;
    }
    // inherited methods for all subclasses
    eval() {
        return new ExpEvalBundle(this.value, this.type, this.constraint);
    }
}

class Sym extends Literal {
    constructor(value) {
        super();
        this.value = value.substring(1);
        this.type = Tycon.symty;
    }
}

class Num extends Literal {

    constructor(int) {
        super();
        this.value = parseInt(int)
        this.type = Tycon.intty;
    }

}

class Bool extends Literal {
    constructor(bool) {
        super();
        this.value = bool == "#t" ? true : false;
        this.type = Tycon.boolty;
    }

}

/** EMPTY LSIT */
class Nil extends Literal {

    constructor() {
        super();
        this.value = "()";
        this.list = [];
        this.type = Type.listtype(new Tyvar());
    }
     
}

/** FOR LISTS */
class Pair extends Literal {

    eval() {
        let fstPackage = this.val1.eval();
        let sndPackage = this.val2.eval();
        let bigConstraint = new And(new Equal(Type.listtype(fstPackage.tau), sndPackage.tau), new And(fstPackage.constraint, sndPackage.constraint))
        return new ExpEvalBundle(this.list, sndPackage.tau, bigConstraint);
    }
    /**
     * 
     * @param {Literal} val1 : expected to be type of element in list
     * @param {Pair} val2 : expected to be a listtype
     */
    constructor(val1, val2) {
        super();
        this.val1 = val1;
        this.val2 = val2;
        this.list = [val1].concat(val2.list);
        let str = "(";
        for (let i = 0; i < this.list.length; i++) {
            str += this.list[i].value + " ";
        }
        str = str.slice(0, -1);
        str += ")";
        this.value = str;
        this.type = val2.type; // dummy type 
    }
   
}

class If extends Expression {

    // all fields are of type Expression
    condition;
    trueCase; 
    falseCase;

    constructor(c, t, f) {
        super();
        this.condition = c;
        this.trueCase = t;
        this.falseCase = f;
    }

    /**
     * @returns {ExpEvalBundle}
     */
    eval() {
        let results = [condition.eval(), trueCase.eval(), falseCase.eval()];
        let index = condition.eval() ? 1 : 2;
        let cs = [new Equal(results[0].tau, Tycon.boolty), new Equal(results[1].tau, results[2].tau)];
        for (let i = 0; i < results.length; i++) {
            cs.push(results[i].constraint);
        }
        let bigC = Constraint.conjoin(cs);
        return new ExpEvalBundle(results[index].val, results[index].tau, bigC);
    }
}

class Var extends Expression {
    name;
    constructor(name) {
        super();
        this.name = name;
    }
}

class Begin extends Expression {

    es = [];
    /**
     * 
     * @param {Array<Expression>} es 
     */
    constructor(es) {
        super();
        this.es = es;
    }
}

class Lambda extends Expression {

    params;
    exp;

    /**
     * @param {Array<String>} params 
     * @param {Expression} exp 
     */
    constructor(params, exp) {
        super();
        this.params = params;
        this.exp = exp;
    }
}

class Let extends Expression {

    bindings;
    exp;

    /**
     * @param {Map<String, Object>} info
     */
    constructor(info) {
        super();
        this.bindings = info["bindings"];
        this.exp = info["exp"];
    }
}

class Letrec extends Let {

}

class LetStar extends Let {
    
}

// abstract class
class Definition {
    exp;
    /**
     * @param {Expression} exp 
     */
    constructor(exp) {
        this.exp = exp;
    }

    eval() {}
}

class Define extends Definition {

}

class Val extends Definition {

}

class ValRec extends Definition {
    
}

module.exports = {Constraint : Constraint, And : And, Equal : Equal, Type : Type, Tycon : Tycon, Trivial : Trivial,
                  Parser: Parser};
