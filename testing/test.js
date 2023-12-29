const {Constraint, And, Equal, Type, Tycon, Trivial} = require("../nml");

let c = [new Equal(Tycon.boolty, Tycon.boolty), new Trivial(), new Equal(Tycon.intty, Tycon.boolty)];
let bigC = Constraint.conjoin(c);
console.log(bigC);