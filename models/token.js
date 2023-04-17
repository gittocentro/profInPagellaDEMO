const mongoose = require("mongoose")
const {Schema} = mongoose;
const crypto = require("crypto")
const User = require("./user")

const tokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    expiry: {
        type: Date, default: Date.now,
    }
},{timestamps: true})

tokenSchema.index({expiry: 1}, {expireAfterSeconds: 600}) //EXPIRES AFTER 10 MINUTES

const Token = mongoose.model("Token", tokenSchema)

module.exports = Token

Token.watch()
    .on("change", async(data) => {
        const user = await User.findById(data.documentKey);
        if (data.operationType == "delete" && user.isVerified === false) {
            //CANCELLAZIONE UTENTE
            await User.findByIdAndDelete(data.documentKey)
            console.log("user deleted!!!")
        }
    })