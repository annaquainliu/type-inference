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
        this.value = "'()";
        let tyvar = new Tyvar();
        this.type = new Forall([tyvar], new Conapp(new Tycon("list"), [tyvar]))
    }
     
}

let l = new Sym("'asdasda")
console.log(l.value + " : " + l.type.typeString);

let i = new Num("90")
console.log(i.value + " : " + i.type.typeString)

let nil = new Nil();
console.log(nil.value + " : " + nil.type.typeString);

let nil2 = new Nil();
console.log(nil2.value + " : " + nil2.type.typeString);



/** FOR LISTS */
// class Pair extends Literal {

//     val1;
//     val2;
//     get type() {

//     }

//     eval() {

//     }
//     /**
//      * 
//      * @param {Literal} val1 
//      * @param {Literal} val2 
//      */
//     constructor(val1, val2) {
//         this.val1 = val1;
//         this.val2 = val2;
//     }
   
// }
