const path = require('path')
const nodemailer = require('nodemailer');
const ejs = require("ejs")

const sendVerificationMail = async function(tk) {
	console.log(process.env.ACCOUNT_GMAIL_PW)
    const server_ip = process.env.SERVER_IP
    try {
		console.log(tk)
		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			auth: {
				user: process.env.ACCOUNT_EMAIL,
				pass: process.env.ACCOUNT_GMAIL_PW, //PASSWORD
			},
            tls: {
                ciphers:'SSLv3'
            }
		});
		const data = await ejs.renderFile(__dirname + "/verificationEmail.ejs", {link: server_ip + "/signup/verification/" + tk._id, token:tk})


		await transporter.sendMail({
			from: process.env.ACCOUNT_EMAIL,
			to: tk.user.email,
			subject: "ProfInPagella email di Verifica",
			template: "email",
			html:data,
		});
		console.log("email sent successfully");
	} catch (error) {
		console.log("email not sent!");
		console.log(error);
		return error;
	}
};

const sendPasswordCode = async function(tk) {
    const server_ip = process.env.SERVER_IP
    const data = await ejs.renderFile(__dirname + "/passwordRecover.ejs", {link: server_ip + "/pw_recover/verification/" + tk._id, token:tk})
    try {
		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			auth: {
				user: process.env.ACCOUNT_EMAIL,
				pass: process.env.ACCOUNT_GMAIL_PW, //PASSWORD
			},
            tls: {
                ciphers:'SSLv3'
            }
		});

		await transporter.sendMail({
			from: process.env.ACCOUNT_EMAIL,
			to: tk.user.email,
			subject: "ProfInPagella Recupero Password",
            html: data,
			
		});
		console.log("email sent successfully");
	} catch (error) {
		console.log("email not sent!");
		console.log(error);
		return error;
	}
};

module.exports = {sendVerificationMail,sendPasswordCode}