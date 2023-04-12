const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect('mongodb://127.0.0.1:27017/rankedTeacherApp', {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => {
    console.log("CONNECTION OPEN")
})
.catch(err => {
    console.log("CONNECTION ERROR!!!");
    console.log(err)
});


const personSchema = new Schema({
    first: String,
    last: String,
});

personSchema.virtual("fullName").get(function () {
    return this.first + " " + this.last;
})

const Person = mongoose.model("Person", personSchema);
