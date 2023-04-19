if (process.env.NODE_NEV !== 'production') {
    require("dotenv").config();
}


const express = require("express")
const app = express()
const path = require("path")

app.use("*", (req,res) => {
    res.render("allgone")
})



app.listen(3000,() => {
    console.log("LISTNENING ON PORT 3000");
})


