'use strict';

// NOTES

// Should we have cards?
// when can invalid intent happen? what does the throw do?
// planner intent: how to deal with difference between text and date?
// session attributes don't need speechoutput or reprompttext
// if they are in the middle of creating a flash card and they then say open planner... is there a way to prompt them?
// after successful create... what to do? How to handle Yes/No ?

var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1"
    // The endpoint is found automatically
});

var docClient = new AWS.DynamoDB.DocumentClient();

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        // if (event.session.application.applicationId !== "amzn1.ask.skill.927ef9d0-0f65-4d48-8c30-653b829b06c6") {
        //    context.fail("Invalid Application ID");
        // }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    //buildResponse(sessionAttributes, speechletResponse);
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};


/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + 
                 ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
                ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for session skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
                ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("FlashCardIntent" === intentName) { // might want to remove
        handleFlashCardIntent(intent, session, callback);
    } else if ("PlannerIntent" === intentName) {
        handlePlannerIntent(intent, session, callback);
    } else if ("LecturesIntent" === intentName) {
        handleLecturesIntent(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) { // Quit
        handleStopRequest(intent, session, callback);
    } else {
        //handleInvalidIntent(intent, session, callback);
        console.log("INVALID INTENT");
        getWelcomeResponse(callback);
        //throw "Invalid intent";
    }

}

function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
                ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Skill Functions -------

function getWelcomeResponse(callback) {
    console.log("WELCOME");

    var sessionAttributes,
        speechOutput,
        repromptText,
        speechletResponse,
        shouldEndSession = false;
    
    speechOutput = "Study Muse here, how can I help you today? ";

    repromptText = "To create a deck or quiz yourself, say flash cards. " +
                    "To add or modify your to do list, say planner. " +
                    "To listen to your recorded lectures and create checkpoints, say lectures. ";
    
    sessionAttributes = {
        "state" : "welcome"
    };

    speechletResponse = buildSpeechletResponse(speechOutput, repromptText, shouldEndSession);

    callback(sessionAttributes, speechletResponse);
}

function handleFlashCardIntent(intent, session, callback) {
    console.log("FLASH CARDS");
    
    var sessionAttributes,
        speechOutput,
        repromptText,
        speechletResponse,
        shouldEndSession = false;

    speechOutput = "flash cards";

    
    sessionAttributes = {
        "state" : "welcome"
    };

    speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

    callback(sessionAttributes, speechletResponse);
}

function handlePlannerIntent(intent, session, callback) {
    console.log("PLANNER");
    
    var sessionAttributes,
        speechOutput,
        repromptText,
        state = "planner",
        speechletResponse,
        shouldEndSession = false;
    if (session.attributes.state == "welcome") {
        console.log("WELCOME");
        speechOutput = "You are now at your to do list. Would you like to listen to your pending assignments " +
                        "or would you like to add, modify, or delete an assignment?";
        repromptText = "please say listen, add, modify, or delete assignment";
        sessionAttributes = {
            "state" : state
        };
        speechletResponse = buildSpeechletResponse(speechOutput, repromptText, shouldEndSession);
        callback(sessionAttributes, speechletResponse);
    } else if ("PlannerState" in intent.slots && "value" in intent.slots.PlannerState) {
        console.log("PLANNER STATE");
        var plannerState = intent.slots.PlannerState.value.toLowerCase();
        var segment;
        if (plannerState === "listen" || plannerState === "hear") {
            segment = "listen";
            //listen will be done here...
        } else if (plannerState === "create" || plannerState === "add") {
            segment = "create";
            //name, date, subject, details
        } else if (plannerState === "modify" || plannerState === "edit") {
            segment = "edit";
        } else if (plannerState === "delete" || plannerState === "remove") {
            segment = "delete";
        }

        speechOutput = "Please say the name of the assignment by filling in the blank in the following: " +
                            "the name is blank";

        sessionAttributes = {
            "state" : state,
            "segment": segment
        };
        speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
        callback(sessionAttributes, speechletResponse);
    } else if ("AssignmentName" in intent.slots && "value" in intent.slots.AssignmentName) {
        console.log("ASSIGNMENT NAME");
        var name = intent.slots.AssignmentName.value.toLowerCase();
        sessionAttributes = {
            "state" : state,
            "segment": session.attributes.segment,
            "name": name
        };
        //gonna depend on segment??
        speechOutput = "Please say the date next. Say the month then day."

        speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
        callback(sessionAttributes, speechletResponse);
    } else if ("Date" in intent.slots && "value" in intent.slots.Date) {
        console.log("DATE");
        // this is where delete ends
        // edit... depends what they want to edit
        var date = intent.slots.Date.value.toLowerCase();
        console.log("date = " + date);
        sessionAttributes = {
            "state" : state,
            "segment": session.attributes.segment,
            "name": session.attributes.name,
            "date": date
        };

        speechOutput = "Please state the subject."

        speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
        callback(sessionAttributes, speechletResponse);
    } else if ("Subject" in intent.slots && "value" in intent.slots.Subject) {
        console.log("SUBJECT");
        var subject = intent.slots.Subject.value.toLowerCase();
        sessionAttributes = {
            "state" : state,
            "segment": session.attributes.segment,
            "name": session.attributes.name,
            "date": session.attributes.date,
            "subject": subject
        };

        speechOutput = "Please state the details by filling in the blank in the following: " +
                            "the details are blank";

        speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
        callback(sessionAttributes, speechletResponse);
    } else if ("Details" in intent.slots && "value" in intent.slots.Details) {
        console.log("DETAILS");
        //this is where create ends...
        var details = intent.slots.Details.value.toLowerCase();
        // sessionAttributes = {
        //     "state" : state,
        //     "segment": session.attributes.segment,
        //     "name": session.attributes.name,
        //     "date": session.attributes.date
        // };
        var params = {
        TableName: "Planner",
        Item: {
            subject: session.attributes.subject,
            date: session.attributes.date,
            name: session.attributes.name,
            details: details
            }
        };

        docClient.put(params, function(err, data) {
            if (err) {
                console.log("ERROR");
                // you can say there was an error... please state the details...
                // fill in session attributes as if it was subject
            } else {
                console.log("SUCCESS");
            }
            //may need to put this in success, make callback(err) if error
            sessionAttributes = {
                "state": state
            }
            speechOutput = session.attributes.name + " has successfully been added. Anything else I can do for you?";
            speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
            callback(sessionAttributes, speechletResponse);
        });

        // sessionAttributes = {
        //     "state": state
        // }

        // speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
        // callback(sessionAttributes, speechletResponse);

    } 



    
    //create
    // var params = {
    //     TableName: "Planner",
    //     Item: {
    //         subject: "english",
    //         date: new Date().toISOString(),
    //         name: "essay",
    //         details: "three pages, twelve point font"
    //     }
    // };

    // docClient.put(params, function(err, data) {
    //     if (err) {
    //         console.log("ERROR");
    //     } else {
    //         console.log("SUCCESS");
    //     }
    //     speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
    //     callback(sessionAttributes, speechletResponse);
    // });
    
    

    // delete needs name and date
    // var params = {
    //     TableName: "Planner",
    //     Key: {
    //         //subject: "english",
    //         //date: "2017-4-20",
    //         name: "essay"
    //         //details: "three pages, twelve point font"
    //     }
    // };

    // docClient.delete(params, function(err, data) {
    //     if (err) {
    //         //console.log("ERROR");
    //         console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
    //     } else {
    //         console.log("SUCCESS");
    //     }
    //     //speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
    //     //callback(sessionAttributes, speechletResponse);
    //     callback(null, data);
    // });

    


    // edit needs date and name... going to have to modify the updateExpression and attribute values...
    // if they want to change name or date you have to delete it... then re-add...
    // cant update the keys
    // var params = {
    //     TableName: "Planner",
    //     Key: {
    //         date: "2017-4-21",
    //         name: "essay"
    //     },
    //     // UpdateExpression: "set details = :details",
    //     // ExpressionAttributeValues: {
    //     //     ":details": "one page, single spaced"
    //     // }
    //     UpdateExpression: "set #ok_date = :date",
    //     ExpressionAttributeValues: {
    //         ":date": "2017-5-1"
    //     },
    //     ExpressionAttributeNames: {
    //         "#ok_date": "date"
    //     }

    // };

    

    // docClient.update(params, function(err, data) {
    //     if (err) {
    //         console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    //     } else {
    //         console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
    //     }
    //     //speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);
    //     //callback(sessionAttributes, speechletResponse);
    //     callback(null, data);
    // });


    // get item needs date and name
    // var params = {
    // TableName: "Planner",
    // Key:{
    //     date: "2017-4-21",
    //     name: "essay"
    //     }
    // };

    // docClient.get(params, function(err, data) {
    //     if (err) {
    //         console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    //     } else {
    //         console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
    //     }
    // });
}

function handleLecturesIntent(intent, session, callback) {
    console.log("LECTURES");
    
    var speechOutput,
        speechletResponse,
        shouldEndSession = false;

    speechOutput = "lectures";


    sessionAttributes = {
        "state" : "welcome"
    };

    speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

    callback(sessionAttributes, speechletResponse);
}


function handleStopRequest(intent, session, callback) {

    var speechOutput,
        speechletResponse,
        shouldEndSession = true;

    // having it just exit for now

    speechOutput = "Good bye"
    

    speechletResponse = 
        buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

    callback(session.attributes, speechletResponse);

}

function handleHelpRequest(intent, session, callback) {
    // Ensure that session.attributes has been initialized
    var speechOutput,
        speechletResponse,
        shouldEndSession = false;

    // may need to edit these later to account for SEGMENTS
    
    if (session.attributes.state == 'welcome') {

        speechOutput = "To create a deck or quiz yourself, say flashcards. " +
                       "To add or modify your to do list, say planner. " +
                       "To listen to your recorded lectures and create checkpoints, say lectures. ";

    } else if (session.attributes.state == 'flashcards') {

        speechOutput = "To create a deck say create deck. ";
        
    } else if (session.attributes.state == 'planner') {

        speechOutput = "To add a task say create. ";
        
    } else if (session.attributes.state == 'lectures') {

        speechOutput = "To create a check point, say check point.";
        
    } 
    
    session.attributes.speechOutput = speechOutput;

    speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

    callback(session.attributes, speechletResponse);
}


// ------- Helper functions to build responses -------

function buildSpeechletResponse(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSSMLSpeechletResponse(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: "<speak>"+output+"</speak>"
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}


function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}