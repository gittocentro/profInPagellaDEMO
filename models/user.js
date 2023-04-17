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

<<<<<<< HEAD
=======
userSchema.statics.findAndRegister = async function(username,email,password) {
    const foundUser = await this.findOne({$or : [
        {username: username}, {email: email}
    ]}).then(data => console.log(data))
    if (foundUser) {
        //MEANS THAT WE CAN'T CONTINUE SINGING UP
        return true
    } else {
        return false
    }
}
userSchema.pre("save", async function(next) {
    if (!this.isVerified) {
        this.password = await bcrypt.hash(this.password, 12)
        //SAVE
    }
    //SAVE
    next()
})

userSchema.pre("findOneAndUpdate", async function(next) {
    const doc = await this.model.findOne(this.getQuery());
    const pwToken = await PwToken.findByIdAndDelete(doc._id)
    next()
})


>>>>>>> 0c441e5e45e33be40fb1c7a71decd998fa73ba9e
const User = mongoose.model("User", userSchema)

module.exports = User;
