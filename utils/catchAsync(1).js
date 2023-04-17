const AppError = require("./AppError")

module.exports = (func, msg, status) => {
    return (req, res, next) => {
        func(req, res, next).catch(e => {
            next(new AppError(msg,status))
            console.log(e) //IN CASE OF DEBUGGING
        })
    }
}