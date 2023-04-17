const BaseJoi = require("joi")
const sanitizeHtml = require("sanitize-html")

const extension = (joi) => ({
    type: "string",
    base: joi.string(),
    messages: {
        "string.escapeHTML":"Non si può includere HTML",
    },
    rules: {
        escapeHtml: {
            validate(value,helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) {
                    return helpers.error("string.escapeHTML", {value})
                }
                return clean
            }
        }
    }
})

const Joi = BaseJoi.extend(extension)

module.exports.userRegisterSchema = Joi.object({
    user: Joi.object({
        username: Joi.string().min(4).max(20).required().escapeHtml().messages({"string.min": "Il nome utente deve avere un minimo di 4 caratteri", "string.max": "Il nome utente può avere un massimo di 20 caratteri"}),
        //email: Joi.string().email().required().escapeHtml().messages({"string.email": "L'email deve essere valida, se usi quelle del burundi non le supportiamo, spiaze."}),
        password: Joi.string().min(4).max(20).required().escapeHtml().messages({"string.min":"La password deve avere almeno 4 caratteri", "string.max": "La password può avere un massimo di 20 caratteri"}),
    }).required()
    .messages({
        "string.empty" : "Tutti i campi sono obbligatori",
    })
})

module.exports.userLoginSchema = Joi.object({
    user: Joi.object({
        username: Joi.string().min(4).max(20).required().escapeHtml().messages({"string.min": "Il nome utente deve avere un minimo di 4 caratteri", "string.max": "Il nome utente può avere un massimo di 20 caratteri"}),
        //email: Joi.string().email().required().escapeHtml().messages({"string.email": "L'email deve essere valida, se usi quelle del burundi non le supportiamo, spiaze."}),
        password: Joi.string().required().escapeHtml(),
    }).required()
    .messages({
        "string.empty" : "Tutti i campi sono obbligatori"
    })
})

module.exports.passwordRecoverSchema = Joi.object({
    password: Joi.string().min(4).max(20).required().escapeHtml()
    .messages({
        "string.empty":"La password è obbligatoria",
        "string.min": "La password deve avere minimo 4 caratteri",
        "string.max":"La password può avere un massimo di 20 caratteri"
    })
})

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        msg: Joi.string().required().max(200).required().escapeHtml().messages({"string.empty":"Scrivi qualcosa nella recensione","string.max": "Sappiamo che hai tanto da dirgli ma più di 200 caratteri è troppo..."}),
        vote: Joi.number().required().min(1).max(10).messages({"number.min":"Il voto può essere minimo 1, purtroppo", "number.max":"Il voto può essere massimo 10"}),
    }).required()
    .messages({
        "any.required": "Tutti i campi sono obbligatori"
    })
})