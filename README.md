#Basic Functionality
>The Monitorbot is a Node.js application using the Express framework that records all messages sent to and from a given account on the Steam gaming platform. The Monitorbot also alerts the user every time a flagged word is detected within one of the incoming or outgoing messages. The list of flagged words is contained in the included "badwords" file. The user is able to download logs with all recorded messages and all flagged events at any time. 

#Using the Application

> ##Activating Monitoring
 1. First, the user creates an account for the application through the
    Auth0 interface. 
 2. After logging in, the user should click "Begin Monitoring an Account"
 3. After inputting the username and password for their Steam account, Steam will send an email with an authentication code to the email account associated with the Auth0 account
 4. On the next screen, the user will have to re-input the username and password for their Steam account along with the authentication code
 5. This will begin monitoring the Steam account. An email will then be sent to confirm that the monitoring activation was successful.

>##Downloading Logs
To download the logs from the monitoring, simply click "Download Logs" link and input the username and password for a Steam account that has been previously activated by the current user account. An email will then be sent with all recorded messages and events for that Steam account. 

#Heroku

>The Monitorbot is deployed through the Heroku platform. The username and password for the Heroku account associated with the application is provided in the "info.txt" file. 

>##Developing for Heroku
Follow the instructions at the given [link](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction) to set up the Heroku environment for continuing development of the application. Other than pushing any changes you make to the Heroku associated Github repository (located at https://git.heroku.com/guardian-test.git), you will be mainly interfacing with Heroku through the Heroku Command Line Interface, which you should have installed when setting up the Heroku environment. For instance, run "heroku open" to open the associated Heroku application in your web browser or run "heroku logs" to view the console output for the Heroku application.  

>##Heroku Processes (also called Dynos)
The Monitorbot uses a web process for handling the main website functionality (the included "index.js" file in the "routes" folder) and a worker process for handling the actual Steam monitoring (the included "monitorbot.js" file). To change the files run by the Heroku processes, modify the included "Procfile" file. 

>##Environmental Variables
Heroku also handles the environmental variables used by the various add-ons through the Heroku config variables. They can be viewed and modified by running "heroku config" in the Heroku CLI.  

>##Heroku Add-ons
A number of the add-ons, such as the MongoDB instance, are provisioned through Heroku. These add-ons can be viewed and inspected through the Heroku web interface. Heroku makes it very simple to provision additional add-ons, allowing you to easily extend the functionality of the application. 

>##Scaling Up
The Monitorbot currently uses the free tier of Heroku's web hosting. The free tier allows for one web process and one worker process with a limited amount of uptime per month. If these processes prove to be insufficient, Heroku makes it very easy to scale up the number of processes using one of the paid tiers.  You can find more information [here](https://devcenter.heroku.com/articles/scaling).


#MongoDB
>The Monitorbot uses MongoDB for its persistent data storage. The data is stored as a list of dictionaries with the following fields:
>
 - auth_name: string
 - steam_name: string
 - steam_password: string
 - steam_auth_code: string
 - user_email: string
 - messages: {datetime: Date() object, message: string}
 - other_events: {datetime: Date() object, event: string}

#Add-ons and Tools Used
>Here are some of the more important software packages used:
>
 - Auth0 is used for user profiles and authentication
 - CloudAMQP is used for communications between the web process and the worker process
 - The Jade templating language is used for the webpage design
	 - The Jade files in the "views" folder are used to render the webpages
 - Node-steam allows the application to interface with steam without actually running the Steam client. The monitoring functionality is derived from the trading functionality used in a sample bot. 
 - Nodemailer is used for email functionality (emails are currently sent from the test Gmail account) 
 >Note: If the mailing service encounters a “AuthError: Invalid login”, the issue is most likely with Gmail flagging nodemailer emails as suspicious. To fix, try [enabling less secure apps](https://www.google.com/settings/security/lesssecureapps) and [allowing outside access]( https://g.co/allowaccess) on the associated gmail accounts. 


#Test Accounts
We have created a number of test accounts for the various services. Most of them use the johnnyintern16@gmail.com email address. The username and passwords for these accounts can be found in the included "info.txt" file. 
