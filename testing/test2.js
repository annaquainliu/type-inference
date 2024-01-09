let map = {};

map["<"] = 1;
map["c"] = 1;
map["asdnk"] = 1;
map["a"] = 1;
map["b"] = 1;
map["c"] = 4;
let entries = Object.entries(map);
for (let i = 0; i < 2; i++) {
    console.log(entries[i]);
}