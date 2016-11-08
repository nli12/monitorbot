        var nodemailer = require("nodemailer");
        var authEmail = process.argv[2];
        var message = process.argv[3];
        // create reusable transport method (opens pool of SMTP connections)
        var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
                user: "johnnyintern16@gmail.com",
                pass: "ltsinterns"
            }
        });

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: "Johnny Intern <johnnyintern16@gmail.com>", // sender address
            to: authEmail, // list of receivers
            subject: "Steam Guardian Alert", // Subject line
            text: "An expicit term was found in the following message: " + message, // plaintext body
       //     html: "<b>Hello world ✔</b>" // html body
        }

        // send mail with defined transport object
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.message);
            }

            // if you don't want to use this transport object anymore, uncomment following line
            //smtpTransport.close(); // shut down the connection pool, no more messages
});    