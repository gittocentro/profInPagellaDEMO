const mongoose = require("mongoose")
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt")
const AppError = require("../utils/AppError")

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "username is required"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    /*,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Reviews",
            validate: [v => v.length < 4, "Non puoi recensire più di 3 volte lo stesso professore"],
        }
    ]*/
})
userSchema.statics.findAndValidate =  async function(username, password) {//LOGIN
    const foundUser = await this.findOne({username})
    const isValid = await bcrypt.compare(password, foundUser.password)
    return isValid ? foundUser : false
}

const User = mongoose.model("User", userSchema)

module.exports = User;
