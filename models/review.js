const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const Teacher = require("./professore")

const reviewSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    msg: {
        type: String,
        required: [true, "Il testo è obbligatorio nella recensione!"],
    },
    vote: {
        type: Number,
        required: [true, "Il voto è obbligatorio nella recensione!"],
        min: 1,
        max: 10,
    },
    //DATE STUFF//
    date: {
        type: String,
    },
})

reviewSchema.pre("save", function(next) {
    const getDate = function() {
        let now = new Date();
        let day = now.getDate();
        let month = now.getMonth() + 1; // add 1 because January is 0
        let year = now.getFullYear();
        const finalDate = day + '/' + month + '/' + year;
        return finalDate
    }
    this.date = getDate();
    next()
})

reviewSchema.post("findOneAndDelete", async function(review) {
    
})

const Review = mongoose.model("Review",reviewSchema)

module.exports = Review

