// page 405 : Expression evaluations
// page 421 : Type Inference Rules

Gamma = {}
Rho = {}

function main() {
    // page 404 : nml expressions
    const input = document.getElementById("code");
    const interpretButton = document.getElementById("interpret")
    interpretButton.addEventListener("click", () => {
        parser(input.value)
    });
    
}

function parser(input) {
    input = input.replaceAll("[", "(")
    input = input.replaceAll("]", ")")
    input = input.split("(").join(" ").split(" ");
    input = input.filter(word => word != "");
    for (let i = 0; i < input.length; i++) {
        let word = input[i];
        if (word.includes(")")) {
            let brackets = word.split("");
            input = input.slice(0, i).concat(brackets).concat(input.slice(i + 1, input.length));
        }
    }
    console.log(input)
    
}


function interpret() {

}

///////////////////////////
//
//      CONSTRAINT SOLVING
//
//
class Constraint {
    static trivial = "T"
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
}

class Equal extends Constraint {

    /**
     * ~ constraint 
     * @param {Constraint} c1 
     * @param {Constraint} c2 
     */
    constructor(c1, c2) {
        super();
        this.c1 = c1;
        this.c2 = c2;
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
    typeString;
    constructor(name) {
        this.typeString = name;
    }

    static listtype(tau) {
        return new Conapp(new Tycon("list"), [tau]);
    }
}

class Tycon extends Type {
    
    static boolty = new Tycon("bool")
    static intty = new Tycon("int")
    static symty = new Tycon("sym")
    static unitty = new Tycon("unit")

    constructor(name) {
        super(name);
    }
}

class Tyvar extends Type {
    static tCounter = -1;

    constructor() {
        Tyvar.tCounter++;
        super("'t" + Tyvar.tCounter);
    }

    static reset() {
        tCounter = 0;
    }
}

class Conapp extends Type {

    /**
     * 
     * @param {Tycon} tycon 
     * @param {Array<Type>} types 
     */
    constructor (tycon, types) {
        let str = "(" + tycon.typeString;
        for (let i = 0; i < types.length; i++) {
            str += " " + types[i].typeString;
        }
        str += ")";
        super(str);
        this.tycon = tycon;
        this.types = types;
    }

}

class Forall extends Type {


    /**
     * Forall datatype constructor
     * @param {Array<Tyvar>} tyvars 
     * @param {Type} tau 
     */
    constructor(tyvars, tau) {
        let str = "(forall [";
        for (let i = 0; i < tyvars.length; i++) {
            str += tyvars[i].typeString + " ";
        }
        str = str.slice(0, -1);
        str += "] " + tau.typeString + ")";
        super(str);
        this.tyvars = tyvars;
        this.tau = tau;
    }
}

class Funty extends Type {

    /**
     * 
     * @param {Array<Type>} taus : Parameter types
     * @param {Type} tau : Return type
     */
    constructor(taus, tau) {
        let str = "("
        for (let i = 0; i < taus.length; i++) {
            str += taus[i].typeString + " ";
        }
        str += "-> " + tau + ")";
        super(str)
        this.taus = taus;
        this.tau = tau;
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
    constructor() {}
    /**
     * @returns {ExpEvalBundle}
     */
    eval() {}
}

class ExpEvalBundle {
    /**
     * 
     * @param {Value} val 
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
        this.constraint = Constraint.trivial;
    }

    static makeLiteral(val) {
        if (val == "#t" || val == "#f") {
            return BoolV(val);
        }
        else if (val[0] == "'(") {

        }
        return Num(val);
    }

    // inherited methods for all subclasses
    eval() {
        return new ExpEvalBundle(value, type, constraint);
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

class BoolV extends Literal {
    constructor(bool) {
        super();
        this.value = bool;
        this.type = Tycon.boolty;
    }

}

/** EMPTY LSIT */
class Nil extends Literal {

    constructor() {
        super();
        this.value = "()";
        this.list = [];
        let tyvar = new Tyvar();
        this.type = new Forall([tyvar], Type.listtype(tyvar))
    }
     
}

/** FOR LISTS */
class Pair extends Literal {
  
    eval() {
        let fstPackage = val1.eval();
        let sndPackage = val2.eval();
        let bigConstraint = new And(new Equal(Type.listtype(fstPackage.tau), sndPackage.tau), new And(fstPackage.constraint, sndPackage.constraint))
        return new ExpEvalBundle(this.value,  sndPackage.tau, bigConstraint);
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
        this.eval();
    }
   
}
