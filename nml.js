// page 405 : Expression evaluations
// page 421 : Type Inference Rules

class Parser {
    queue = [];
    expKeywords = ["let", "let*", "letrec", "if", "begin", "lambda"];
    defineKeywords = ["val", "define", "val-rec"];

    constructor() {
        Environments.reset();
        Environments.initEnvs();
        this.predefs();
    }

    predefs() {
        let predefs = Environments.predefs();
        for (let predef of predefs) {
            this.interpret(predef);
        }
        Environments.gammaMapping = "";
    }

    interpret(value) {
        let def = this.tokenInput(value);
        return def.eval(Environments.Gamma, Environments.Rho);
    }

    getSteps(value) {
        let def = this.tokenInput(value);
        return def.getSteps();
    }

    tokenInput(input) {
        input = input.toLowerCase();
        input = input.replaceAll("[", "(");
        input = input.replaceAll("]", ")");
        this.queue = [];
        let str = "";
        for (let i = 0; i < input.length; i++) {
            if (input[i] == "(" || input[i] == ")" || input[i] == " ") {
                if (str != "") {
                    this.queue.push(str);
                }
                if (input[i] != " ") {
                    this.queue.push(input[i]);
                }
                str = ""
            }
            else {
                str += input[i];
            }
        }
        if (this.queue[this.queue.length - 1] != str && str != "" && str != " ") {
            this.queue.push(str);
        }
        this.queue = this.queue.reverse();
        if (this.queue.length >= 2 && this.defineKeywords.includes(this.queue[this.queue.length - 2])) {
            this.queue.pop();
            return this.tokenDefinition(this.queue.pop());
        }
        return new Exp("it", this.tokenize(this.queue.pop()));
    }

    tokenDefinition(def) {
        if (def == "val") {
            return new Val(this.queue.pop(), this.tokenize(this.queue.pop()));
        }
        else if (def == "val-rec") {
            return new ValRec(this.queue.pop(), this.tokenLambda());
        }
        else {
            return new Define(this.queue.pop(), this.tokenLambda());
        }   
    }

    /**
     * Tokenizes code written by user
     * 
     * @param {String} exp 
     * @returns {Expression} 
     */
    tokenize(exp) {
        if (exp == "(") {
            let item = this.queue.pop();
            if (this.expKeywords.includes(item)) {
                return this.tokenize(item);
            }
            let fun = this.tokenize(item);
            let args = [];
            item = this.queue.pop();
            while (item != ")") {
                args.push(this.tokenize(item));
                item = this.queue.pop();
            }
            return new Apply(fun, args);
        }
        else if (exp == "if") {
            let exp = new If(this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()));
            this.queue.pop();
            return exp;
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
            this.queue.pop();
            return this.tokenPair();
        }
        else if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (exp[0] == "'") {
            return new Sym(exp.substring(1));
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
        return new List(this.tokenListLiterals(item), this.tokenPair());
    }

    tokenListLiterals(exp) {
        if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (/^-?\d+$/.test(exp)) {
            return new Num(exp);
        }
        else if (exp == "(") {
            return this.tokenPair();
        }
        return new Sym(exp);
    }

    //  [')', 'x', ')', ')', '3', 'x', 'let']
    tokenLet() {
        this.queue.pop(); // for (
        let bindings = this.tokenLetBindings();
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for last closing )
        return {"bindings": bindings, "exp" : exp};
    }

    tokenLetBindings() {
        let item = this.queue.pop();
        let bindings = [];
        while (item != ")") {
            let name = this.queue.pop();
            let exp = this.tokenize(this.queue.pop());
            bindings.push([name, exp]);
            this.queue.pop(); // for opening )
            item = this.queue.pop();
        }
        return bindings;
    }

    tokenLambda() {
        let params = [];
        this.queue.pop(); // opening (
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
     * 
     fun compose (theta2, theta1) =
        let val domain  = union (dom theta2, dom theta1)
            val replace = tysubst theta2 o varsubst theta1
        in  mkEnv (domain, map replace domain)
        end
     * @param {Substitution} theta1 
     * @param {Substitution} theta2 
     * @returns {Substitution} this
     */
    compose(theta2) {
        let domain = Object.keys(this.mapping);
        let snd = Object.keys(theta2.mapping);
        for (let name of snd) {
            if (!domain.includes(name)) {
                domain.push(name);
            }
        }
        let mapping = {};
        for (let name of domain) {
            let tau = this.mapping[name];
            if (tau == null) {
                tau = new Tyvar(name);
            }
            mapping[name] = tau.tysubst(theta2)
        }
        return new Substitution(mapping);
    }

    /**
     * 
     * @param {Map<String, Type>} mapping
     */
    constructor(mapping) {
        this.mapping = mapping;
    }

    toString() {
        if (Object.keys(this.mapping).length == 0) {
            return "()";
        }
        let str = "(";
        let keys = Object.keys(this.mapping);
        for (let key of keys) {
            str += key + " |--> " + this.mapping[key].typeString + ", "
        }
        str = str.substring(0, str.length - 2);
        str += ")"
        return str;
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

    /**
     * @returns {Array<Tyvar>} 
     */
    freetyvars() {}
}


class Trivial extends Constraint {

    solve() {
        return Substitution.idsubst;
    }

    toString() {
        return "T";
    }
 
    consubst(sub) {return this;}

    freetyvars() {return [];}

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

    freetyvars() {
        return Tyvar.union(this.c1.freetyvars(), this.c2.freetyvars());
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
        this.tau1 = this.tau1.tysubst(sub);
        this.tau2 = this.tau2.tysubst(sub);
        return this;
    }

    freetyvars() {
        return Tyvar.union(this.tau1.freetyvars(), this.tau2.freetyvars());
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

    static pairtype(tau1, tau2) {
        return new Conapp(new Tycon("pair"), [tau1, tau2]);
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

     /**
      * Substitutes a substitution into a type
      * @param {Substitution} theta 
      * @returns {Type}
      */
     tysubst(theta) {}

     /**
      * Returns whether tyvars includes tyvar
      * @param {Array<Tyvar>} tyvars 
      * @param {Tyvar} tyvar 
      * @returns {Boolean}
      */
     static includes(tyvars, tyvar) {
        for (let ty of tyvars) {
            if (ty.typeString == tyvar.typeString) {
                return true;
            }
        }
        return false;
     }

     generalize(set) {
        let ftvars = this.freetyvars();
        let diff = [];
        for (let ftvar of ftvars) {
            if (!Type.includes(set, ftvar) && !Type.includes(diff, ftvar)) {
                diff.push(ftvar);
            }
        }
        return new Forall(diff, this);
    }

    alphabetasize() {
        let freetyvars = this.freetyvars();
        let sub = {};
        for (let i = 0; i < freetyvars.length; i++) {
            let alpha = new Tyvar("'" + String.fromCharCode(i + 97));
            sub[freetyvars[i].typeString] = alpha;
            freetyvars[i] = alpha;
        }
        return this.tysubst(new Substitution(sub));
    }

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
        throw new NmlError(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves tycon ~ conapp equality
     * @param {Conapp} conapp 
     * @returns {Substitution}
     */
    solveConapp(conapp) {
        throw new NmlError(conapp.typeString + " cannot equal " + this.typeString);
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
    
    tysubst(sub) {
        return this;
    }

}

class Tyvar extends Type {
    static tCounter = 0;
    count;

    constructor(name) {
        super();
        if (name == "" || name == undefined) {
            this.count = Tyvar.tCounter;
            this.typeString = "'t" + this.count;
            Tyvar.tCounter++;
        }
        else {
            this.typeString = name;
        }
    }

    static reset() {
        tCounter = 0;
    }

    /**
     * Returns the union of fst and snd
     * @param {Array<Tyvar>} fst 
     * @param {Array<Tyvar>} snd 
     * @returns {Array<Tyvar>}
     */
    static union(fst, snd) {
        let array = fst;
        for (let tyvar of snd) {
            if (!Type.includes(array, tyvar)) {
                array.push(tyvar);
            }
        }
        return array;
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
        if (Type.includes(conapp.freetyvars(), this)) {
            throw new NmlError(this.typeString + "occurs in " + conapp.typeString);
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
        map[tyvar.typeString] = this;
        return new Substitution(map);
    }

    tysubst(sub) {
        let type = sub.mapping[this.typeString];
        if (type == null) {
            return this;
        }
        return type;
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
        throw new NmlError(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves conapp ~ conapp equality
     * 
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.types.length != this.types.length) {
            throw new NmlError(this.typeString + " ~ " + conapp.typeString + " have different length types array");
        }
        let bigConstraint = new Equal(this.tycon, conapp.tycon);
        for (let i = 0; i < conapp.types.length; i++) {
            bigConstraint = new And(new Equal(conapp.types[i], this.types[i]), bigConstraint);
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

    tysubst(sub) {
        let newTypes = [];
        for (let type of this.types) {
            newTypes.push(type.tysubst(sub));
        }
        return new Conapp(this.tycon.tysubst(sub), newTypes);
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
        if (this.tyvars.length == 0) {
            return this.tau.typeString;
        }
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
            if (!Tycon.includes(generalized, tyvar)) {
                diff.push(tyvar);
            }
        }
        return diff;
    }

    tysubst(sub) {
        return this.tau.tysubst(sub);
    }

    solve(tau) {
        return this.tau.solve(tau);
    }

    alphabetasize() {
        let freetyvars = this.tyvars.length == 0 ? this.freetyvars() : this.tyvars;
        let sub = {};
        for (let i = 0; i < freetyvars.length; i++) {
            let alpha = new Tyvar("'" + String.fromCharCode(i + 97));
            sub[freetyvars[i].typeString] = alpha;
            freetyvars[i] = alpha;
        }
        this.tau = this.tysubst(new Substitution(sub));
        return this;
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

    tysubst(sub) {
        let subTau = super.tysubst(sub);
        return new Funty(subTau.types[0].types, subTau.types[1]);
    }
}

class Environments {

    static Gamma = {};
    static Rho = {};
    static gammaMapping = "";

    static reset() {
        Environments.Gamma = {};
        Environments.Rho = {};
    }

    /**
     * 
     * @param {String} name 
     * @param {Type} type 
     * @param {String} state
     */
    static mapInGamma(name, type, state) {
        if (state != undefined) {
            Environments.gammaMapping = state;
        }       
        Environments.gammaMapping += "{ " + name + " → " + type.typeString + " }";
    }

    static initEnvs() {
        let arithTau = new Funty([Tycon.intty, Tycon.intty], Tycon.intty);
        let compareTau = new Funty([new Tyvar("a"), new Tyvar("a")], Tycon.boolty);
        let binaryParams = ["fst", "snd"];
        Environments.makeFunction("+", binaryParams, arithTau, 
                    rho => new Num(rho["fst"].value + rho["snd"].value))
                    ,
                    gamma => new TypeBundle(Tycon.intty, new Trivial());
        Environments.makeFunction("-", binaryParams, arithTau,
                    rho => new Num(rho["fst"].value - rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("/", binaryParams, arithTau,
                    rho => new Num(rho["fst"].value / rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("*", binaryParams, arithTau,
                    rho => new Num(rho["fst"].value * rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("=", binaryParams, compareTau,
                    rho => new Bool(rho["fst"].equal(rho["snd"]))
                    ,
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("mod", binaryParams, arithTau,
                    rho => new Num(rho["fst"].value % rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction(">", binaryParams, new Funty([Tycon.intty, Tycon.intty], Tycon.boolty),
                    rho => new Bool(rho["fst"].value > rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("<", binaryParams, new Funty([Tycon.intty, Tycon.intty], Tycon.boolty),
                    rho => new Bool(rho["fst"].value < rho["snd"].value)
                    ,
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("car", ["list"], new Funty([Type.listtype(new Tyvar("a"))], new Tyvar("a")),
                    rho => {
                        if (rho["list"] instanceof Nil) {
                            throw new NmlError("Runtime error: car applied to empty list.");
                        }
                        return rho["list"].val1;
                    },
                    gamma => new TypeBundle(gamma["list"].tau.val1.type, new Trivial()))
        Environments.makeFunction("cdr", ["list"], new Funty([Type.listtype(new Tyvar("a"))], Type.listtype(new Tyvar("a"))),
                    rho => {
                        if (rho["list"] instanceof Nil) {
                            throw new NmlError("Runtime error: cdr applied to empty list.");
                        }
                        return rho["list"].val2;
                    },
                    gamma => new TypeBundle(gamma["list"].tau, new Trivial()))
        Environments.makeFunction("cons", ["item", "list"], new Funty([new Tyvar("a"), Type.listtype(new Tyvar("a"))], Type.listtype(new Tyvar("a"))),
                    rho => new List(rho["item"], rho["list"])
                    ,
                    gamma => new TypeBundle(Type.listtype(gamma["item"].tau), new Equal(Type.listtype(gamma["item"].tau), gamma["list"].tau)))
        Environments.makeFunction("or", binaryParams, new Funty([Tycon.boolty, Tycon.boolty], Tycon.boolty), 
                    rho => new Bool(rho["fst"].boolean || rho["snd"].boolean)
                    ,
                    gamma => new TypeBundle(Type.boolty, new Trivial()));
        Environments.makeFunction("and", binaryParams, new Funty([Tycon.boolty, Tycon.boolty], Tycon.boolty),
                    rho => new Bool(rho["fst"].boolean && rho["snd"].boolean)
                    ,
                    gamma => new TypeBundle(Type.boolty, new Trivial()));
        Environments.makeFunction("pair", binaryParams, new Funty([new Tyvar("a"), new Tyvar("b")], Type.pairtype(new Tyvar("a"), new Tyvar("b"))), 
                    rho => new Pair(rho["fst"], rho["snd"])
                    ,
                    gamma => new TypeBundle(Type.pairtype(gamma["fst"].tau, gamma["snd"].tau), new Trivial()))
        Environments.makeFunction("fst", ["pair"], new Funty([Tycon.pairtype(new Tyvar("a"), new Tyvar("b"))], new Tyvar("a")), 
                    rho => rho["pair"].val1
                    ,
                    gamma => new TypeBundle(gamma["pair"].tau.types[0], new Trivial()));
        Environments.makeFunction("snd", ["pair"], new Funty([Tycon.pairtype(new Tyvar("a"), new Tyvar("b"))], new Tyvar("b")), 
                    rho => rho["pair"].val2,
                    gamma => new TypeBundle(gamma["pair"].tau.types[1], new Trivial()));
        Environments.makeFunction("not", ["bool"], new Funty([Tycon.boolty], Tycon.boolty), 
                    rho => new Bool(!rho["bool"].boolean)
                    ,
                    gamma => new TypeBundle(Type.boolty, new Trivial()));
    }

    static predefs() {
        return [
            "(define null? (xs) (= xs '()))",
            "(define foldl (f acc xs) (if (null? xs) acc (foldl f (f (car xs) acc) (cdr xs))))",
            "(define foldr (f acc xs) (if (null? xs) acc (f (car xs) (foldr f acc (cdr xs)))))",
            "(define exists? (p? xs) (if (null? xs) #f (if (p? (car xs)) #t (exists? p? (cdr xs)))))",
            "(define list1 (item) (cons item '()))",
            "(define revapp (xs ys) (if (null? xs) ys (revapp (cdr xs) (cons (car xs) ys))))",
            "(define caar (xs) (car (car xs)))",
            "(define cdar (xs) (cdr (car xs)))",
            "(define cadr (xs) (car (cdr xs)))",
            "(define list1 (x)               (cons x '()))",
            "(define list2 (x y)             (cons x (list1 y)))"
            , "(define list3 (x y z)           (cons x (list2 y z)))"
            , "(define list4 (x y z a)         (cons x (list3 y z a)))"
            , "(define list5 (x y z a b)       (cons x (list4 y z a b)))"
            , "(define list6 (x y z a b c)     (cons x (list5 y z a b c)))"
            , "(define list7 (x y z a b c d)   (cons x (list6 y z a b c d)))"
            , "(define list8 (x y z a b c d e) (cons x (list7 y z a b c d e)))"
            , "(define o (f g) (lambda (x) (f (g x))))"
        ]
    }

    static makeFunction(name, params, type, evalFun, typeFun) {
        let exp = new Expression();
        exp.eval = evalFun;
        exp.typeCheck = typeFun;
        let lambda = new Lambda(params, exp);
        Environments.Rho[name] = lambda;
        Environments.Gamma[name] = type.generalize([]);
    }

    static freetyvars(Gamma) {
        let freevars = [];
        let taus = Object.values(Gamma);
        for (let tau of taus) {
            freevars = freevars.concat(tau.freetyvars());
        }
        return freevars;
    }

    static copy(environment) {
        let newEnv = {};
        let names = Object.keys(environment);
        for (let name of names) {
            newEnv[name] = environment[name];
        }
        return newEnv;
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

    initialGammaState = ""; // the state of gamma before the exp is evaluated
    result; // TypeBundle

    constructor() {}

    /**
     * Evaluates the expression
     * @param {Map<String, Expression>} Rho : Mapping of names to values
     * @returns {Expression} : Can either return  a lambda or a literal
     */
    eval(Rho) {}

    /**
     * @returns {TreeNode}
     */
    getSteps() {}

    /**
     * Only type checks the expression, without evaluation
     * Sets the initialGammaState and result field;
     * @param {Map<String, Type>} Gamma 
     * @returns {TypeBundle} 
     */
    typeCheck(Gamma) {
        this.initialGammaState = Environments.gammaMapping;
    }

    equal(snd) {
        throw new NmlError("Compared expressions for equality.");
    }

    /**
     * @returns {String}
     */
    conclusion() {
        return Definition.GammaChar 
            + this.initialGammaState + " " + Definition.Turnstile + " " 
            + this.abstractSyntax();
    }

    /**
     * @returns {String}
     */
    abstractSyntax() {}
}


class TypeBundle {

    /**
     * @param {Type} tau 
     * @param {Constraint} constraint 
     */
    constructor(tau, constraint) {
        this.tau = tau;
        this.constraint = constraint;
    }
}


class Apply extends Expression {
    exp; // function var or lambda
    args;
    /**
     * @param {Expression} exp 
     * @param {Array<Expression>} args 
     */
    constructor(exp, args) {
        super();
        this.exp = exp;
        this.args = args;
    }

    eval(Rho) {
        let lambdaBundle = this.exp.eval(Rho); 
        if (!lambdaBundle instanceof Lambda) {
            throw new NmlError("Cannot apply a non-function value.");
        }
        let extendedClosure = Environments.copy(lambdaBundle.closure);
        let paramNames = lambdaBundle.params;
        if (this.args.length != paramNames.length) {
            throw new NmlError("Mistmatch amount of arguments and parameters");
        }
        for (let i in this.args) {
            extendedClosure[paramNames[i]] = this.args[i].eval(Rho)
        }
        let result = lambdaBundle.body.eval(extendedClosure);
        return result;
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let funtyAndC = this.exp.typeCheck(Gamma);
        let taus = [];
        let constraints = [funtyAndC.constraint];
        for (let arg of this.args) {
            let tyC = arg.typeCheck(Gamma);
            taus.push(tyC.tau);
            constraints.push(tyC.constraint);
        }
        let tyvar = new Tyvar();
        let funty = new Funty(taus, tyvar);
        constraints.push(new Equal(funtyAndC.tau, funty));
        let bigC = Constraint.conjoin(constraints);
        this.result = new TypeBundle(tyvar, bigC);
        return this.result;
    }

    /**
     * 
     * @returns {TreeNode}
     */
    getSteps() {
        let steps = [];
        steps.push(this.exp.getSteps());
        for (let arg of this.args) {
            steps.push(arg.getSteps());
        }
        return new ExpNode(this.conclusion(), steps, this.result);
    }

    abstractSyntax() {
        let syntax = "Apply(" + this.exp.abstractSyntax() + ", ";
        for (let arg of this.args) {
            syntax += arg.abstractSyntax() + ", ";
        }
        syntax = syntax.substring(0, syntax.length - 2);
        syntax += ")";
        return syntax;
    }
}

// abstract class
class Literal extends Expression {

    value;
    constraint; // Constraint
    type; // Type

    // private constructor, not meant to be instantiated
    constructor() {
        super();
        this.constraint = new Trivial();;
    }
    // inherited methods for all subclasses
    eval(Rho) {
        return this;
    }

    getSteps() {
        return new ExpNode(this.conclusion(), [], this.result);
    }

    abstractSyntax() {
        return "Literal(" + this.value + ")";
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        this.result = new TypeBundle(this.type, this.constraint);
        return this.result;
    }

    /**
     * @param {Literal} snd 
     */
    equal(snd) {
        return this.value == snd.value;
    }
}

class Sym extends Literal {
    constructor(value) {
        super();
        this.value = value;
        this.type = Tycon.symty;
    }
}

class Num extends Literal {

    constructor(int) {
        super();
        let result = int;
        if (int instanceof String) {
            result = parseInt(int);
        }
        this.value = Math.floor(result);
        this.type = Tycon.intty;
    }

}

class Bool extends Literal {
    /**
     * 
     * @param {String or Boolean} bool 
     */
    constructor(bool) {
        super();
        // bool is of type boolean
        if (bool == true || bool == false) {
            this.value = bool ? "#t" : "#f";
            this.boolean = bool;
        }
        else {
            this.value = bool;
            this.boolean = bool == "#t"
        }
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
class List extends Literal {

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let fst = this.val1.typeCheck(Gamma);
        let snd = this.val2.typeCheck(Gamma);
        let bigConstraint = new And(new And(fst.constraint, snd.constraint), new Equal(Type.listtype(fst.tau), snd.tau))
        this.result = new TypeBundle(snd.tau, bigConstraint);
        return this.result;
    }
    /**
     * 
     * @param {Literal} val1 : expected to be type of element in list
     * @param {List} val2 : expected to be a listtype
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

class Pair extends Literal {

    /**
     * @param {Literal} val1 
     * @param {Literal} val2 
     */
    constructor(val1, val2) {
        super();
        this.val1 = val1;
        this.val2 = val2;
        this.value = "(" + val1.value + " . " + val2.value + ")";
        this.type = Tycon.pairtype(this.val1.type, this.val2.type); // dummy type
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let tau1 = this.val1.typeCheck(Gamma);
        let tau2 = this.val2.typeCheck(Gamma);
        this.result = new TypeBundle(Tycon.pairtype(tau1.tau, tau2.tau), new And(tau1.constraint, tau2.constraint));
        return this.result;
    }
}

class Unit extends Literal {

    constructor() {
        super();
        this.value = "()";
        this.type = Tycon.unitty;
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
     * @returns {Expression}
     */
    eval(Rho) {
        let condition = this.condition.eval(Rho);
        let result = condition.boolean ? this.trueCase.eval(Rho) : this.falseCase.eval(Rho);
        return result;
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let results = [this.condition.typeCheck(Gamma), 
                        this.trueCase.typeCheck(Gamma), 
                        this.falseCase.typeCheck(Gamma)];
        let cs = [new Equal(results[0].tau, Tycon.boolty), new Equal(results[1].tau, results[2].tau)];
        for (let i = 0; i < results.length; i++) {
            cs.push(results[i].constraint);
        }
        let bigC = Constraint.conjoin(cs);
        this.result = new TypeBundle(results[1].tau, bigC);
        return this.result;
    }

    getSteps() {
        let children = [this.condition.getSteps(), this.trueCase.getSteps(), this.falseCase.getSteps()];
        return new ExpNode(this.conclusion(), children, this.result);
    }

    abstractSyntax() {
        return "If(" + this.condition.abstractSyntax() + ", " + this.trueCase.abstractSyntax() 
                    + ", " + this.falseCase.abstractSyntax() + ")";
    }
}

class Var extends Expression {
    name;
    constructor(name) {
        super();
        this.name = name;
    }

    eval(Rho) {
        if (Rho[this.name] == null) {
            throw new NmlError(this.name + " is not in Rho.");
        }
        return Rho[this.name];
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let type_scheme = Gamma[this.name];
        let sub = {};
        for (let tyvar of type_scheme.tyvars) {
            let newTyvar = new Tyvar();
            sub[tyvar.typeString] = newTyvar;
        }
        let newType = type_scheme.tau.tysubst(new Substitution(sub));
        this.result = new TypeBundle(newType, new Trivial());
        return this.result;
    }

    getSteps() {
        return new ExpNode(this.conclusion(), [], this.result);
    }

    abstractSyntax() {
        return "Var(" + this.name + ")";
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

    eval(Rho) {
        let lastResult = new Unit();
        for (let e of this.es) {
            lastResult = e.eval(Rho);
        }
        return lastResult;
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let lastTau = Tycon.unitty;
        let constraints = [];
        for (let e of this.es) {
            let tauBundle = e.typeCheck(Gamma);
            lastTau = tauBundle.tau;
            constraints.push(tauBundle.constraint);
        }
        let bigC = Constraint.conjoin(constraints);
        this.result = new TypeBundle(lastTau, bigC);
        return this.result;
    }

    getSteps() {
        let steps = [];
        for (let e of this.es) {
            steps.push(e.getSteps());
        }
        return new ExpNode(this.conclusion(), steps, this.result);
    }

    abstractSyntax() {
        let syntax = "Begin(";
        for (let e of this.es) {
            syntax += e.abstractSyntax() + ", ";
        }
        if (this.es.length > 0) {
            syntax = syntax.substring(0, syntax.length - 2)
        }
        syntax += ")";
        return syntax;
    }
}

class Lambda extends Expression {

    params;
    body;
    closure;
    value;
    /**
     * @param {Array<String>} params 
     * @param {Expression} exp 
     */
    constructor(params, exp) {
        super();
        this.params = params;
        this.body = exp;
        this.closure = {};
        this.value = "<function>"
    }

    eval(Rho) {
        this.closure = Environments.copy(Rho);
        return this;
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let newGamma = Environments.copy(Gamma);
        let tyvars = []
        for (let param of this.params) {
            let tyvar = new Tyvar();
            newGamma[param] = new Forall([], tyvar);
            Environments.mapInGamma(param, new Forall([], tyvar));
            tyvars.push(tyvar);
        }
        let body = this.body.typeCheck(newGamma);
        this.result = new TypeBundle(new Funty(tyvars, body.tau), body.constraint);
        return this.result;
    }

    getSteps() {
        return new ExpNode(this.conclusion(), [this.body.getSteps()], this.result);
    }

    abstractSyntax() {
        let syntax = "Lambda(<";
        for (let param of this.params) {
            syntax += param + ", ";
        }
        if (this.params.length > 0) {
            syntax = syntax.substring(0, syntax.length - 2);
        }
        syntax += ">, ";
        syntax += this.body.abstractSyntax() + ")";
        return syntax;

    }
}

class Let extends Expression {

    // for interpreting
    bindings;
    exp;

    // for tree
    constraintNode;
    tySubstNodes;
    generalizeNodes;
    cPrime;
    union;
    /**
     * @param {Map<String, Object>} info
     */
    constructor(info) {
        super();
        this.bindings = info["bindings"];
        this.exp = info["exp"];
        this.constraintNode = null;
        this.tySubstNodes = [];
        this.generalizeNodes = [];
        this.cPrime = null;
        this.union = [];
    }
    /**
     * Evaluate all expressions in the bindings
     * Evaluate let body in extended rho environment
     * Return the evaluation of the body
     * @param {Map<String, Expression>} Rho 
     */
    eval(Rho) {
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval(Rho);
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        super.typeCheck(Gamma);
        let types = [];
        let constraints = [];
        let names = this.bindings.map(entry => entry[0]);
        for (let entry of this.bindings) {
            let typeBundle = entry[1].typeCheck(Gamma);
            types.push(typeBundle.tau);
            constraints.push(typeBundle.constraint);
        }
        let c = Constraint.conjoin(constraints);
        this.result = this.solveRestWithC(c, Gamma, types, names);
        return this.result;
    }

    solveRestWithC(c, Gamma, types, names) {
        let theta = c.solve();
        this.constraintNode = new ThetaNode(c, theta);
        let domTheta = Object.keys(theta.mapping);
        let freetyvars = Environments.freetyvars(Gamma);
        let inter = [];
        for (let freetyvar of freetyvars) {
            if (domTheta.includes(freetyvar.typeString)) {
                inter.push(freetyvar);
            }
        }
        let alphaConstraints = [];
        for (let alpha of inter) {
            alphaConstraints.push(new Equal(alpha, alpha.tysubst(theta)));
        }
        let cPrime = Constraint.conjoin(alphaConstraints);
        this.cPrime = cPrime;
        let constraintfreetyvars = cPrime.freetyvars();
        let union = Tyvar.union(constraintfreetyvars, freetyvars);
        this.union = union;
        let sigmas = [];
        for (let tau of types) {
            let tauSubst = tau.tysubst(theta);
            let sigma = tauSubst.generalize(union);
            sigmas.push(sigma);
            this.tySubstNodes.push(new TySubstNode(tau, tauSubst));
            this.generalizeNodes.push(new GenNode(tauSubst, sigma));
        }
        let extendedGamma = Environments.copy(Gamma);
        Environments.gammaMapping = this.initialGammaState;
        for (let i in names) {
            extendedGamma[names[i]] = sigmas[i];
            Environments.mapInGamma(names[i], sigmas[i]);
        }
        let tauBundle = this.exp.typeCheck(extendedGamma);
        return new TypeBundle(tauBundle.tau, new And(tauBundle.constraint, cPrime));
    }

    abstractSyntax(name) {
        let syntax = (name == undefined ? "Let" : name) + "(<";
        for (let binding of this.bindings) {
            syntax += binding[0] + ", " + binding[1].abstractSyntax() + ", ";
        }
        syntax = syntax.substring(0, syntax.length - 2);
        syntax += ">, " + this.exp.abstractSyntax() + ")";
        return syntax;
    }

    getSteps() {
        let steps = [];
        for (let binding of this.bindings) {
            steps.push(binding[1].getSteps());
        }
        steps.push(this.constraintNode);
        steps = steps.concat(this.tySubstNodes);
        let ftvNode = new FtvarNode(this.initialGammaState, this.union);
        ftvNode.value = "ftv(" + this.cPrime.toString() + ") ∪ " + ftvNode.value;
        steps.push(ftvNode);
        steps = steps.concat(this.generalizeNodes);
        steps.push(this.exp.getSteps());
        return new ExpNode(this.conclusion(), steps, this.result);
    }
}

class Letrec extends Let {

    eval(Rho) {
        //parsing
        let exps = this.bindings.map(entry => entry[1]);
        for (let exp of exps) {
            if (!(exp instanceof Lambda)) {
                throw new NmlError("Expression bound in letrec binding is not a lambda.");
            }
        }
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval({});
        }
        for (let entry of this.bindings) {
            newRho[entry[0]].closure = newRho;
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        this.initialGammaState = Environments.gammaMapping;
        let tyvars = []; // distinct and fresh type variables
        let names = this.bindings.map(entry => entry[0]);
        let exps = this.bindings.map(entry => entry[1]);
        let gammaPrime = Environments.copy(Gamma);
        for (let name of names) {
            let tyvar = new Tyvar();
            tyvars.push(tyvar);
            gammaPrime[name] = new Forall([], tyvar);
            Environments.mapInGamma(name,  new Forall([], tyvar));
        }
        let taus = [];
        let constraints = [];
        for (let exp of exps) {
            let tauAndC = exp.typeCheck(gammaPrime);
            taus.push(tauAndC.tau);
            constraints.push(tauAndC.constraint);
        }
        for (let i in taus) {
            constraints.push(new Equal(taus[i], tyvars[i]));
        }
        let constraint = Constraint.conjoin(constraints);
        let final = this.solveRestWithC(constraint, Gamma, taus, names);
        this.result = final;
        return final;
    }

    abstractSyntax() {
        return super.abstractSyntax("Letrec");
    }
}

class LetStar extends Let {
    
    constructor(map) {
        super(map);
        this.newLet = null;
    }
    eval(Rho) {
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval(newRho);
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        this.initialGammaState = Environments.gammaMapping;
        if (this.bindings.length == 0) {
            this.result = this.exp.typeCheck(Gamma);
            return this.result;
        }
        let newLet = new Let({"bindings" : [this.bindings[0]], 
                              "exp" : new LetStar({"bindings" : this.bindings.slice(1), "exp" : this.exp})});
        this.result = newLet.typeCheck(Gamma);
        this.newLet = newLet;
        return this.result;
    }

    getSteps() {
        if (this.newLet == null) {
            return new ExpNode(this.conclusion(), [], this.result);
        }
        return new ExpNode(this.conclusion(), [this.newLet.getSteps()], this.result);
    }

    abstractSyntax() {
        return super.abstractSyntax("LetStar");
    }

}

// abstract class
class Definition {
    exp;
    name;
    initialGammaState = "";
    finalGammaState = "";
    constraintNode = null;
    tysubstNode = null;
    genNode = null;
    ftvNode = null;

    static GammaChar = "Γ";
    static Turnstile = "⊢";
    /**
     * @param {String} name
     * @param {Expression} exp 
     */
    constructor(name, exp) {
        if (!exp instanceof Expression) {
            throw new NmlError(name + " is not assigned an expression!");
        }
        this.exp = exp;
        this.name = name;
    }

    eval(Gamma, Rho) {
        this.initialGammaState = Environments.gammaMapping;
    }

    /**
     * Returns the operational semantic steps of the definition type inference
     * @returns {Map<String, Object>}
     */
    getSteps() {
        let bundle = this.eval(Environments.Gamma, Environments.Rho);
        let node = new DefNode(this.conclusion(), [this.exp.getSteps(), this.constraintNode, this.tysubstNode, this.ftvNode, this.genNode], this.finalGammaState);
        return {"steps" : node, "result" : bundle};
    }

    /**
     * Returns the conclusion in the operational semantics of the given definition
     * @returns {String}
     */
    conclusion() {
        return "<" + this.abstractSyntax() + ", " + Definition.GammaChar + this.initialGammaState + ">"; 
    }

    /**
     * Returns the string of the abstract syntax of the definition
     * @returns {String}
     */
    abstractSyntax() {}

}

class DefEvalBundle {

    /**
     * 
     * @param {String} value 
     * @param {Type} tau 
     */
    constructor(value, tau) {
        this.value = value;
        this.tau = tau.alphabetasize();
    }

    toString() {
        return this.value + " : " + this.tau.typeString;
    }
}

class Exp extends Definition {

    constructor(name, exp) {
        super(name, exp);
        this.valExp = new Val("it", this.exp);
    }

    eval(Gamma, Rho) {
        let result = this.valExp.eval(Gamma, Rho);
        result.value = result.expValue;
        return result;
    }

    getSteps() {
        this.initialGammaState = Environments.gammaMapping;
        let bundle = this.valExp.getSteps();
        bundle["result"].value = bundle["result"].expValue;
        this.finalGammaState = Environments.gammaMapping;
        this.sub = this.valExp.sub;
        return {"steps" : new DefNode(this.conclusion(), [bundle["steps"]], this.finalGammaState), "result" : bundle["result"]}
    }

    abstractSyntax() {
        return "Exp(" + this.exp.abstractSyntax() + ")";
    }
}

// function types
class Define extends Definition {

    constructor(name, exp) {
        super(name, exp);
        this.valrec = new ValRec(this.name, this.exp);
    }

    eval(Gamma, Rho) {
        return this.valrec.eval(Gamma, Rho);
    }

    getSteps() {
        this.initialGammaState = Environments.gammaMapping;
        let bundle = this.valrec.getSteps();
        this.finalGammaState = Environments.gammaMapping;
        this.sub = this.valrec.sub;
        return {"steps" : new DefNode(this.conclusion(), [bundle["steps"]], this.finalGammaState), "result" : bundle["result"]}
    }

    abstractSyntax() {
        return "Define(" + this.name + ", " + this.exp.abstractSyntax() + ")";
    }
}

// val
class Val extends Definition {

    eval(Gamma, Rho) {
        super.eval();
        let value = this.exp.eval(Rho);
        let type = this.exp.typeCheck(Gamma);
        let theta = type.constraint.solve();
        this.constraintNode = new ThetaNode(type.constraint, theta);
        let newTau = type.tau.tysubst(theta);
        this.tysubstNode = new TySubstNode(type.tau, newTau);
        let ftvs = Environments.freetyvars(Gamma);
        let sigma = newTau.generalize(ftvs);
        this.ftvNode = new FtvarNode(this.initialGammaState, ftvs)
        this.genNode = new GenNode(newTau, sigma);
        Gamma[this.name] = sigma;
        Environments.mapInGamma(this.name, sigma, this.initialGammaState);
        Rho[this.name] = value;
        let name = value.value;
        if (value instanceof Lambda) {
            name = this.name;
        }
        let result = new DefEvalBundle(name, sigma);
        result.expValue = value.value;
        this.finalGammaState = Environments.gammaMapping;
        return result;
    }

    abstractSyntax() {
        return "Val(" + this.name + ", " + this.exp.abstractSyntax() + ")";
    }
}

class ValRec extends Definition {

    constructor(name, exp) {
        super(name, exp);
        if (!exp instanceof Lambda) {
            throw new NmlError("val-rec/define not given a lambda expression!");
        }
    }

    eval(Gamma, Rho) {
        super.eval();
        // evaluation
        let lambda = this.exp.eval({});
        Rho[this.name] = lambda;
        lambda.closure = Environments.copy(Rho);
        
        //type inference
        let alpha = new Tyvar();
        let gammaPrime = Environments.copy(Gamma);
        gammaPrime[this.name] = new Forall([], alpha);
        let type = this.exp.typeCheck(gammaPrime);
        let constraint = new And(type.constraint, new Equal(alpha, type.tau));
        let theta = constraint.solve();
        this.constraintNode = new ThetaNode(constraint, theta);
        let subbedTau = alpha.tysubst(theta);
        this.tysubstNode = new TySubstNode(alpha, subbedTau);
        let ftvs = Environments.freetyvars(Gamma);
        let sigma = subbedTau.generalize(ftvs);
        this.ftvNode = new FtvarNode(this.initialGammaState, ftvs)
        this.genNode = new GenNode(subbedTau, sigma);
        Gamma[this.name] = sigma;
        Environments.mapInGamma(this.name, sigma, this.initialGammaState);
        this.finalGammaState = Environments.gammaMapping;
        return new DefEvalBundle(this.name, sigma);;
    }

    abstractSyntax() {
        return "Val-rec(" + this.name + ", " + this.exp.abstractSyntax() + ")";
    }

}

class TreeNode {
    value;
    children;
    id;
    static treeIds = 0;
    /**
     * Builds a node in the Type Inference tree
     * @param {String} value : 
     * @param {List<TreeNode>} children 
     */
    constructor(value, children) {
        this.value = value;
        this.children = children;
    }   

    appendChild(child) {
        this.children.push(child);
    }

    /**
     * @returns {Node}
     */
    toHtml() {
        let node = document.createElement("div");
        let text = document.createElement("span");
        text.innerText = this.value;
        this.id = TreeNode.treeIds;
        TreeNode.treeIds++;
        text.id = "" + this.id;
        node.appendChild(text);
        node.className = "treeNode";
        let childrenDiv = document.createElement("div");
        childrenDiv.className = "horizontalTree"
        for (let child of this.children) {
            childrenDiv.appendChild(child.toHtml());
        }
        node.appendChild(childrenDiv);
        return node;
    }
}

class Leaf extends TreeNode {
    /**
     * 
     * @param {String} value 
     */
    constructor(value) {
        super(value, []);
    }

    toHtml() {
        let div = super.toHtml();
        div.className = "leaf";
        return div;
    }
}

class StepNode extends TreeNode {
    result;  
    /**
     * 
     * @param {String} value 
     * @param {List<TreeNode>} children 
     * @param {String} result 
     */
    constructor(value, children, result) {
        super(value, children);
        this.result = new Leaf(result);
    }

    toHtml() {
        let node = super.toHtml();
        node.appendChild(this.result.toHtml());
        return node;
    }
}

class ExpNode extends StepNode {
    
    /**
     * 
     * @param {String} value 
     * @param {List<TreeNode>} children 
     * @param {TypeBundle} result 
     */
    constructor(value, children, result) {
        super(value, children, result.tau.typeString + ", " + result.constraint.toString());
    }
}

class ThetaNode extends StepNode {

    /**
     * @param {Constraint} constraint 
     * @param {Substitution} theta 
     */
    constructor(constraint, theta) {
        super("solve(" + constraint.toString() + ")", [], "ϴ = " + theta.toString());
    }
}

class TySubstNode extends StepNode {

   /**
    * @param {Type} tau 
    * @param {Type} result 
    */
    constructor(tau, result) {
        super( "ϴ" + tau.typeString, [], result.typeString);
    }
}

class GenNode extends StepNode {

    /**
     * 
     * @param {Type} tau 
     * @param {Forall} generalized 
     */
    constructor(tau, generalized) {
        super("generalize(" + tau.typeString + ", A)", [], generalized.typeString);
    }
}

class FtvarNode extends StepNode {

    constructor(initialGammaState, ftvs) {
        let ftvSet = "{";
        for (let ftv of ftvs) {
            ftvSet += ftv.typeString + ", ";
        }
        if (ftvs.length > 0) {
            ftvSet = ftvSet.substring(0, ftvSet.length - 2);
        }
        ftvSet += "}";
        super("ftv(" + Definition.GammaChar + initialGammaState + ")", [], "A = " + ftvSet);
    }
}

class DefNode extends StepNode {

    /**
     * 
     * @param {String} value : Definition conclusion
     * @param {List<TreeNode>} children 
     * @param {String} finalGammaState 
     */
    constructor(value, children, finalGammaState) {
        super(value, children, Definition.GammaChar + finalGammaState);
    }
}

function main() {
    // page 404 : nml expressions
    const input = document.getElementById("code");
    const interpretButton = document.getElementById("interpret")
    const output = document.getElementById("output");
    const steps = document.getElementById("steps");
    const clearEnvs = document.getElementById("clear");
    const walkthrough = document.getElementById("walkthrough");
    const nextStep = document.getElementById("nextStep");

    var parser = new Parser();
    clearEnvs.addEventListener("click", () => {
        Environments.reset();
        Environments.initEnvs();
        parser.predefs();
    });
    
    let currId, fstId, lastId;
    walkthrough.addEventListener("click", () => {
        if (nextStep.style.display == "none") {
            nextStep.style.display = "block";
        }
        else if (currId != undefined && document.getElementById(currId - 1) != null) {
            document.getElementById(currId - 1).style.color = "black";
        }
        fstId = parseInt(steps.children[0].children[0].id);
        lastId = parseInt(steps.children[0].children[2].children[0].id);
        currId = fstId;
    });

    nextStep.addEventListener("click", () => {
        if (steps.children.length == 0) {
            return;
        }
        if (document.getElementById(currId - 1) != null) {
            document.getElementById(currId - 1).style.color = "black";
        }
        if (currId == lastId + 1) {
            nextStep.style.display = "none";
            return;
        }
        document.getElementById(currId).style.color = "blue";
        currId++;
    });

    interpretButton.addEventListener("click", () => {
        try {
            let value = parser.getSteps(input.value);
            output.innerText = value["result"].toString();
            steps.replaceChildren(value["steps"].toHtml());
        }
        catch(e) {
            if (e instanceof NmlError) {
                alert(e.message);
            }
            else {
                alert("Ill typed Nml code");
            }
        }
    });
}

class NmlError extends Error {}

main();

// module.exports = {Constraint : Constraint, And : And, Equal : Equal, Type : Type, Tycon : Tycon, Trivial : Trivial,
//                   Parser: Parser, Forall : Forall, Conapp : Conapp, Tyvar : Tyvar, Substitution : Substitution,
//                   Environments : Environments};
