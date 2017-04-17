'use strict';

// NOTES

// Should we have cards?
// when can invalid intent happen? what does the throw do?
// should subject slot type be defined?
// planner intent: how to deal with difference between text and date?

var AWS = require("aws-sdk");

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
        throw "Invalid intent";
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

    repromptText = "To create a deck or quiz yourself, say flashcards. " +
                    "To add or modify your to do list, say planner. " +
                    "To listen to your recorded lectures and create checkpoints, say lectures. ";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "state" : "welcome"
    };

    speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

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
        "speechOutput": speechOutput,
        "repromptText": speechOutput,
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
        speechletResponse,
        shouldEndSession = false;

    speechOutput = "planner";


    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": speechOutput,
        "state" : "welcome"
    };

    speechletResponse = buildSpeechletResponse(speechOutput, speechOutput, shouldEndSession);

    callback(sessionAttributes, speechletResponse);
}

function handleLecturesIntent(intent, session, callback) {
    console.log("LECTURES");
    
    var speechOutput,
        speechletResponse,
        shouldEndSession = false;

    speechOutput = "lectures";


    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": speechOutput,
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