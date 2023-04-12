//MODELS
const Teacher = require("./models/professore")

const mongoose = require("mongoose");
mongoose.connect('mongodb://127.0.0.1:27017/rankedTeacherApp', {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => {
    console.log("CONNECTION OPEN")
})
.catch(err => {
    console.log("CONNECTION ERROR!!!");
    console.log(err)
});

const seedTeachers = [
    {
        first: "Maria Donatella",
        last: "Fasano",
        rank: 10,
        school: "64359553c94b3b3e2c434a74",
        subjects: ["Matematica"],
    },
    {
        first: "Grazia",
        last: "Paragò",
        rank: 1,
        school: "64359553c94b3b3e2c434a74",
        subjects: ["Inglese"],
    },
    {
        first: "Giovanni",
        last: "Santoro",
        rank: 3,
        school: "64359553c94b3b3e2c434a74",
        subjects: ["Arte e immagine"],
    },
    {
        first: "Giovanni",
        last: "Acquaviva",
        rank: 3,
        school: "64359553c94b3b3e2c434a74",
        subjects: ["Fisica"],
    },
    {
        first: "Adalgisa",
        last: "Caroli",
        rank: 2,
        school: "64359553c94b3b3e2c434a74",
        subjects: ["Filosofia", "Storia"],
        
    }
];

Teacher.insertMany(seedTeachers, {runValidators: true})
    .then(t => {
        console.log(t);
    })
    .catch(e => {
        console.log(e);
    })