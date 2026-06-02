Integration Steps
To implement the basic Hosted Session solution in your system, follow the instructions below.

Prerequisites
Before implementing a Hosted Session solution, check with your payment service provider to ensure you meet the following prerequisites:
Ensure that you have a merchant account and that your merchant profile is enabled for the Hosted Session service.
Select and set up your API authentication method.
We recommend integrating with API version 100 for best results and future support. Hosted Session supports any version later than 18.

Implementing a Hosted Session Integration
The Hosted Session solution works through API operations (requests and responses), which are used to, for example, manage sessions and initiate or retrieve information about various payment transactions. You also need the Session JavaScript library to manage the hosted payment form fields in your app or web page, when payer participation is needed to gather payment details for a transaction. For more information about handling sessions, see Payment Sessions.

You can use all the API operations available for the REST Server APIs. However, you do not need the Hosted Checkout-related API operations, as they are required for the related integration method.
For more information about making server API requests, see Making a Server API Request.

To perform an operation, you must first have it enabled on your merchant profile by your payment service provider. To check which operations are available for you or to troubleshoot any API errors, contact your payment service provider. The operations available to you are limited to the capability of the acquirers configured on your merchant profile with Mastercard Gateway. If a functionality is not supported for the acquirer on the gateway, any operation requests to execute that functionality are rejected by the gateway (for that acquirer).
When payer participation is needed, each task you perform with the Hosted Session integration method consists of the following steps:
In your server, create a new session as a container for all the sensitive data required by the transaction.
In your app or web site, attach the hosted form fields to your payment page and allow the payer to fill them in.
In your app or web site, update the session with the provided data.
In your server, send a payment transaction request to the gateway, referring to the session.
In your server, retrieve the response data from the payment transaction. Interpret the response and display the transaction result to the payer in your app or web site.

For information on handling steps 1-4 above, see Making a Payment. For information about handling the transaction result, see Interpreting the Response.

For a collection of example requests covering the common transaction operation requests, download the Postman collection.

After your integration is completed and you are able to manage basic requests and responses:
Consider your payment lifecycles and needs for any subsequent operations after the basic payment transaction is completed.
Determine any customizations you need to make based on the specific payment methods you want to support.
Consider what kind of security or other additional features you want to offer or use in your integration.
Test your entire solution.

Hosted form fields
To attach the hosted form fields to your payment page using Mastercard GatewayHosted Session, use the PaymentSession.configure() function provided by Mastercard's JavaScript SDK.

Follow these steps to attach the hosted form fields:

Include the Mastercard Hosted Session Script.
Replace <your_merchant_id> and <version> with your actual values.
Configure the Hosted Fields Use PaymentSession.configure() to attach the hosted fields to your HTML form.
Mastercard hosts secure iFrames that replace the fields you specify.
You must create a session through the API before calling configure().
The API version used in the session creation must match the version in the script URL.


Payment Sessions
A payment session, or simply session, is a temporary container for request fields containing sensitive data about a specific order. You can use a session to allow the payer to provide their sensitive payment details directly to the Mastercard Gateway. This way you can simply reference the session in any later transaction request, without having to handle the payment details directly. When the Mastercard Gateway receives a transaction request that references a session, it forms the final transaction by combining the fields in the session with those supplied directly in the request.

Using sessions enables more sophisticated integrations where different parts of the request are captured at different points in the payment flow or through different channels. Payment flows for both the Hosted Session and some payment methods, for example, Click to Pay, use sessions to collect and store sensitive payer information. This reduces PCI compliance requirements and implementation costs as you do not handle or store any payment details on your server.

The lifecycle of a single session covers:
Creating the session in your server.
Updating the session in your server with any non-sensitive information you want to store in the session.
Using the session on your web site or app to allow the gateway to gather any sensitive payment details from the payer.
Referencing the session in payment transactions or other operations in your server.

A single session lasts usually about 15 minutes, during which you can send one or more payment transactions, as needed.

Creating a session
You can create a session using the Create Session operation. In the request, you can optionally provide the authentication limit (session.authenticationLimit), which indicates the number of operations which can be submitted to the gateway using the session ID as a password. If the limit is not provided, the gateway sets a default value. You can use the session ID as a password in requests that use session authentication. Session authentication allows you to make API requests directly from your app or web site (instead of your server), and can be used for 3D Secure authentication requests.

The Create Session operation returns the following fields:
session.id - Unique session ID which you must provide on subsequent requests to reference the session.
session.authenticationLimit - Limit you supplied in the request, or the gateway's default value.
session.aes256Key - Key you can use to decrypt sensitive data passed to your web site through the payer's browser or mobile device.
session.version - Session version. You can use this field to implement optimistic locking of the session content.
session.updateStatus - Summary of the outcome of the last attempt to modify the session.

CREATE SESSION request example
URL	https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/<merchant_ID>/session
HTTP Method	POST

{
    "session": {
      "authenticationLimit": 25
    }
}
   
Updating a session
You can add or update request fields in a session using the Update Session operation. It allows you to add payment and payer data into a session that can subsequently become the input to determine the risk associated with a payer in an authentication operation.

Alternatively, you can update a session using the Update Session From Wallet operation with Click to Pay.

When updating a session, you cannot remove fields from the session, you can only overwrite the values for existing fields.
The Update Session operation can be used in your server to add fields to the session. To add sensitive payment information to a session (by allowing the payer to provide them directly to the gateway), you must use hosted fields on your payment page. For more details on how to handle the hosted fields within the session, see Making a Payment.
UPDATE SESSION request example
URL	https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/<merchant_ID>/session/<session_ID>
HTTP Method	PUT


{
    "order": {
      "amount": 100,
      "currency": "USD"
    }
}

   
Using a session in a payment transaction
After you have added all the relevant fields to the session (directly from your server or using hosted fields on your payment page), you can refer to that session in any of the following operations by using the session.id field:

Verify
Pay
Authorize
Standalone Capture
Standalone Refund
Create or Update Token
Payment Options Inquiry
Initiate Authentication
Authenticate Payer
It is recommended that you retrieve the session details using the Retrieve Session transaction and check the session contents before you initiate a payment or Tokenization operation.
When you refer to a session in an operation request, if a value for the same field is provided both in the referred session and in the operation request itself, the value in the operation request is used. For more information, see Implementing Multiple Hosted Sessions.
You can perform multiple operations using the same session, for example Pay and Create or Update Token. This is useful if you want to both initiate a payment and store a token to use in future payments.

The API version for operations referencing a session must match the API version used when managing the session itself (such as Create Session and Update Session).
Once you initiate an operation that references a session (except Update Session and Update Session From Wallet), the card security code, if stored in the session, is removed. This is necessary to comply with PCI regulations. If you want to save the card details for later use, you can do this by performing a Create or Update Token operation using the session.
Making business decisions based on session content
If you make business decisions based upon data obtained from a session, you need to use the optimistic locking capability of the session. This ensures that the data you use to make your decisions is the same as that used to process your request operation.

Examples of business decisions based on the session content include:
Calculating the surcharge amount based on the card type provided by the payer.
Calculating the shipping amount based on the shipping address provided by the payer.
To use the optimistic locking capability:
Retrieve the session content using the Retrieve Session operation.
Take note of the session.version value in the response.
Make the business decisions, as needed.
Send your operation request to the gateway and include the session.version value along with the session ID in the request.

If the session content has changed, the session.version in your request does not match the current version and the gateway rejects the operation with error.cause=INVALID_REQUEST.


Making a Payment
This guide explains how to set up a payment system on your website using a session-based method. In this setup, you collect sensitive payment details like card numbers directly on your page using hosted fields—secure input fields provided by the payment gateway.
To do this, you use:

The Session JavaScript library (session.js) to handle the secure parts in the browser.
The WSAPI (Web Services API) to manage the payment process on the server side.
If you want to see a full example of how the entire payment page should look and work, check out the Payment Page Code Example.

Step 1: Create a session
Create a Session by submitting a Create Session request from your server. Specify a Session authentication limit of 25. The response returns a Session ID that you must use in the subsequent steps to reference this Session.

URL	https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/<merchant_ID>/session
HTTP Method	POST
{
    "session": {
        "authenticationLimit": 25
    }
}
Step 2: Update the session with the order details
Update the Session with at least the currency and order amount by submitting an Update Session request from your server. The order currency is needed so that you can determine whether the credit card the payer wants to use is supported and whether they need to provide their Card Security Code (CSC).

URL	https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/<merchant_ID>/session/<session_ID>
HTTP Method	PUT
{
    "order": {
        "amount": 100,
            "currency": "USD"
    }
}
Step 3: Include the session JavaScript library
To use the payment session on your website, you need to include a special JavaScript file called session.js, which is hosted by the payment gateway:

Add a <script> tag inside the <head> section of your HTML page to load this file.
The link to the file will include your API version and your merchant ID, so it is specific to your setup.
Once added, this script will create a PaymentSession object that your page can use to handle the payment process.
<html>
<head>  
<script src="https://test-seylan.mtf.gateway.mastercard.com/form/version/100/merchant/<MERCHANTID>/session.js"></script>
</head>
</html>
Step 4: Create the payment page
Create the HTML code for your payment page, including the fields for gathering the necessary payment details from the payer.

To prevent submission of sensitive data to your server, ensure that all sensitive data fields are set as readonly and omit the name attribute.
You can use one or more of the following payment methods to capture payment details from the payer. The fields you need to include on your payment page depend on the payment method:

Credit and Debit cards
You can capture the following card details in hosted fields:

card.number
card.expiryMonth
card.expiryYear
card.securityCode
card.nameOnCard
All the fields are optional; however, if card.expiryMonth is used then card.expiryYear is mandatory and vice versa.
Gift cards
You can capture the following gift card details in hosted fields:

giftCard.number
giftCard.pin
For more information, see Gift Cards.

Automated Clearing House (ACH) Payments
You can capture payment details for Direct Payments (payments) and Direct Deposits (refunds) through Automated Clearing House. You can capture the following Automated Clearing House details in hosted fields:

ach.routingNumber
ach.bankAccountNumber
ach.bankAccountNumberConfirmation
ach.bankAccountHolder
ach.accountType
For more information, see Automated Clearing House.

Click to Pay
You can capture payment details from Click to Pay interaction. For more information, see Click to Pay Hosted Session Integration.

For every supported payment method, the Hosted Session allows you to collect and submit full, partial, or individual (except card expiry month and card expiry year) payment details into a payment Session. You can use the returned payment Session in combination with other payment data sources to process a payment. For example, if you have already tokenized the payer's card number and expiry date, you can use the Hosted Session to collect only the CSC or CVV,and use the card details from both sources collectively to perform a payment. Alternatively, if the card stored against a token has expired, you can use the Hosted Session to collect the new card expiry date in a payment Session and update the token.
The following sample code illustrates the necessary payment page fields for a credit card payment.

Example Request
<!-- CREATE THE HTML FOR THE PAYMENT PAGE -->
    <div>
      Please enter your payment details:
    </div>
    <div>
      Cardholder Name:
      <input type="text" id="cardholder-name" class="input-field" title="cardholder name"
      aria-label="enter name on card" value="" tabindex="1" readonly>
    </div>
    <div>
      Card Number:
      <input type="text" id="card-number" class="input-field" title="card number"
      aria-label="enter your card number" value="" tabindex="2" readonly>
    </div>
    <div>
      Expiry Month:
      <input type="text" id="expiry-month" class="input-field" title="expiry month"
      aria-label="two digit expiry month" value="" tabindex="3" readonly>
    </div>
    <div>
      Expiry Year:
      <input type="text" id="expiry-year" class="input-field" title="expiry year"
      aria-label="two digit expiry year" value="" tabindex="4" readonly>
    </div>
    <div>
      Security Code:
      <input type="text" id="security-code" class="input-field" title="security code"
      aria-label="three digit CCV security code" value="" tabindex="5" readonly>
    </div>
    <div>
      <button id="payButton" onclick="pay();">
        Pay Now
      </button>
    </div>
Step 5: Configure the session
Invoke the PaymentSession.configure() function with a configuration object as an argument to attach the hosted fields to your payment page and configure the payment interaction. You need to provide the following in the configuration object:
Session ID received when you created the Session.
Field selectors for hosted fields for specific payment methods. The configuration replaces them with corresponding proxy fields embedded in iFrames hosted by the Mastercard Gateway. The proxy fields have the same look and feel as the replaced fields.
Mitigation options for clickjacking prevention. Clickjacking, also known as a "UI redress attack", is when an attacker uses multiple transparent or opaque layers to trick a user into clicking on a button or link on another page when they were intending to click on the top-level page. To use the Hosted Session, you must implement one or more of the following defenses against clickjacking attacks and specify which defenses are implemented using the frameEmbeddingMitigation field:
Javascript: Include "frame-breaker" JavaScript on your payment page.
x-frame-options: Your server returns an X-Frame Options HTTP response header.
csp: Your server returns a Content-Security-Policy HTTP response header containing a frame-ancestors directive.
For information on defending against clickjacking attacks, see Clickjacking Defense Cheat Sheet on the OWASP external website.

Callbacks for handling various events during the Hosted Session interaction:
initialized() is invoked when the hosted fields attach to your payment page.
formSessionUpdate() is invoked in response to the PaymentSession.updateSessionFromForm(paymentType) function (see next step).
Interaction details that define the visibility and payer interaction options for some displayed information.

Session Configuration Example
<body>
    PaymentSession.configure({
    session: “<your_session_ID>”,
  fields: {
    // ATTACH HOSTED FIELDS TO YOUR PAYMENT PAGE FOR A CREDIT CARD
    card: {
      number: “#card - number”,
      securityCode: “#security - code”,
      expiryMonth: “#expiry - month”,
      expiryYear: “#expiry - year”,
      nameOnCard: “#cardholder - name”
    }
  },
  //SPECIFY YOUR MITIGATION OPTION HERE
  frameEmbeddingMitigation: [“javascript”],
  callbacks: {
    initialized: function(response) {
      // HANDLE INITIALIZATION RESPONSE
    },
    formSessionUpdate: function(response) {
      // HANDLE RESPONSE FOR UPDATE SESSION
    },
  },
  interaction: {
    displayControl: {
      formatCard: “EMBOSSED”,
      invalidFieldCharacters: “REJECT”
    }
  }
});
</body>
Step 6: Update the session with field details
After the payer has entered their payment details in the hosted fields, invoke the PaymentSession.updateSessionFromForm() function with the applicable payment method as an argument. The function stores the captured payment details into the payment Session. Once the operation completes, the formSessionUpdate() callback is invoked with a result parameter. Check the result.status field to determine if the operation was successful. For more information, see Handling Callback Responses.

Session update example
function pay() {
    // UPDATE THE SESSION WITH THE INPUT FROM HOSTED FIELDS
    PaymentSession.updateSessionFromForm('card');
}
Step 7: Create payment using the session
Send the payment transaction (or other related operation) from your server to the gateway using the Session ID (session.id) in the request:

Send the Retrieve Session request to verify the details included in the Session.
Create the transaction request by adding any necessary fields not included in the Session.
If you provide in the request a field that is already defined in the Session, the gateway uses the value in the request.
Send the transaction request. For more information about handling API requests, see Making a Server API Request.
You can send multiple operations related to the payment using the same Session. For example, you can both initiate a payment with a PAY operation and store a token representing the payment details (for use in future transactions) with the Create or Update Token operation.

Payment page code example
The following sample code illustrates the HTML code for a full payment page.

Details
<html>
<head>
    // INCLUDE SESSION.JS JAVASCRIPT LIBRARY 
    <script src="https://test-seylan.mtf.gateway.mastercard.com/form/version/<version>/merchant/<merchant_ID>/session.js"></script>
    // APPLY CLICK-JACKING STYLING AND HIDE CONTENTS OF THE PAGE 
    <style id="antiClickjack">body{display:none !important;}</style>
</head>
              
<body>
    // CREATE THE HTML FOR THE PAYMENT PAGE
    <div>
      Please enter your payment details:
    </div>
    <h3>
        Credit Card
    </h3>
    <div>
        Card Number:
        <input type="text" id="card-number" class="input-field" title="card number"
        aria-label="enter your card number" value="" tabindex="1" readonly>
    </div>
    <div>
        Expiry Month:
        <input type="text" id="expiry-month" class="input-field" title="expiry month"
        aria-label="two digit expiry month" value="" tabindex="2" readonly>
        </div>
    <div>
        Expiry Year:
        <input type="text" id="expiry-year" class="input-field" title="expiry year"
        aria-label="two digit expiry year" value="" tabindex="3" readonly>
    </div>
    <div>
        Security Code:
        <input type="text" id="security-code" class="input-field" title="security code"
        aria-label="three digit CCV security code" value="" tabindex="4" readonly>
    </div>
    <div>
        Cardholder Name:
        <input type="text" id="cardholder-name" class="input-field" title="cardholder name"
        aria-label="enter name on card" value="" tabindex="5" readonly>
    </div>
    <div>
        <button id="payButton" onclick="pay('card');">
          Pay Now
        </button>
    </div>            
    // JAVASCRIPT FRAME-BREAKER CODE TO PROVIDE PROTECTION AGAINST IFRAME
    CLICK-JACKING
    <script type="text/javascript">
        if (self === top) {
          var antiClickjack = document.getElementById("antiClickjack");
          antiClickjack.parentNode.removeChild(antiClickjack);
        } else {
          top.location = self.location;
        }
                  
        PaymentSession.configure({
          session: "<your_session_ID>",
          fields: {
           // ATTACH HOSTED FIELDS TO YOUR PAYMENT PAGE FOR A CREDIT CARD
           card: {
             number: "#card-number",
             securityCode: "#security-code",
             expiryMonth: "#expiry-month",
             expiryYear: "#expiry-year",
             nameOnCard: "#cardholder-name"
            }
        },
        //SPECIFY YOUR MITIGATION OPTION HERE
        frameEmbeddingMitigation: ["javascript"],
        callbacks: {
          initialized: function(response) {
            // HANDLE INITIALIZATION RESPONSE
          },
          formSessionUpdate: function(response) {
            // HANDLE RESPONSE FOR UPDATE SESSION
            if (response.status) {
              if ("ok" == response.status) {
                console.log("Session updated with data: " + response.session.id);
                //check if the security code was provided by the user
                if (response.sourceOfFunds.provided.card.securityCode) {
                  console.log("Security code was provided.");
                }
                //check if the user entered a Mastercard credit card
                if (response.sourceOfFunds.provided.card.scheme == 'MASTERCARD') {
                  console.log("The user entered a Mastercard credit card.")
                }
              } else if ("fields_in_error" == response.status) {
                console.log("Session update failed with field errors.");
                if (response.errors.cardNumber) {
                  console.log("Card number invalid or missing.");
                }
                if (response.errors.expiryYear) {
                  console.log("Expiry year invalid or missing.");
                }
                if (response.errors.expiryMonth) {
                  console.log("Expiry month invalid or missing.");
                }
                if (response.errors.securityCode) {
                  console.log("Security code invalid.");
                }
              } else if ("request_timeout" == response.status) {
                console.log("Session update failed with request timeout: " + response.errors.message);
              } else if ("system_error" == response.status) {
                console.log("Session update failed with system error: " + response.errors.message);
              }
            } else {
              console.log("Session update failed: " + response);
            }
          }
        },
        interaction: {
          displayControl: {
            formatCard: "EMBOSSED",
            invalidFieldCharacters: "REJECT"
          }
        }
      });
      function pay() {
        // UPDATE THE SESSION WITH THE INPUT FROM HOSTED FIELDS
        PaymentSession.updateSessionFromForm('card');
      }
    </script>
                  
</body>            
</html>
Payment page callbacks
The Hosted Session allows you to use various callbacks to customize how the payment page behaves and what kind of feedback it provides to the payer.

Callbacks for session configuration
This section defines the Session configuration callbacks and the responses returned by their result callbacks. For an example of how to handle the callbacks in your payment page code, see Payment Page Code Example.

The callbacks used in the PaymentSession.configure() function:
initialized(result) callback is invoked when the hosted fields are attached to the payment page:
If result.status=="ok", the hosted fields are successfully attached to your payment page.
Successful Initialization response example
// An ok response
{
  "status": "ok"
}
If result.status=="system_error" or result.status=="request_timeout", an error has occurred while attaching the hosted fields. Retry after a short delay.
Failed Initialization response example
// An error response (system_error)
    {
      "status": "system_error",
      "message": "System error message."
    }
    // An error response (request_timeout)
    {
      "status": "request_timeout",
      "message": "Request timeout error message."
    }
formSessionUpdate(result) callback is invoked when the hosted field content is stored in the Session:
If result.status=="ok", the Session now contains the collected payment details.
Form Session update example for successful response
// An ok response
    {
      "status": "ok",
      "merchant": "TESTMERCHANT",
      "session": {
        "id": "SESSION000218450948092491657986""updateStatus": "SUCCESS",
        "version": "e3f144ce02"
      },
      "sourceOfFunds": {
        "provided": {
          "card": {
            "brand": "MASTERCARD",
            "expiry": {
              "month": "1",
              "year": "39"
            },
            "fundingMethod": "DEBIT",
            "nameOnCard": "John Smith",
            "number": "512345xxxxxx8769",
            "scheme": "MASTERCARD"
          }
        },
        "type": "CARD"
      },
      "version": "43"
    }
If result.status=="fields_in_error", the payer input is invalid. Prompt the payer to update their input. The errors response structure contains information about the invalid fields.
Form Session update example for error response
// An error response (fields_in_error)
{
  "status": "fields_in_error",
  "session": {
    "id": "SESSION000218450948092491657986"
  },
  "errors": {
    "cardNumber": "invalid",
    "securityCode": "invalid"
  },
  "version": "43"
}
If result.status=="system_error" or result.status=="request_timeout", an error has occurred when processing the update. Retry the Session update after a short delay.
Form Session update example for system error and timeout response
// An error response (system_error)
{
    "status": "system_error",
    "session": {
        "id": "SESSION000218450948092491657986"
    },
    "errors": {
        "message": "System error message."
    },
    "version": "43"
}
  // An error response (request_timeout)
{
    "status": "request_timeout",
    "session": {
        "id": "SESSION000218450948092491657986"
    },
    "errors": {
        "message": "Request timeout error message."
    },
    "version": "43"
}

Callbacks for hosted fields
The Hosted Session allows you to register callback functions to handle events that can occur on the hosted fields during the payer's interaction. The events allow you to track what the payer is doing and provide validation feedback to them during various payment interaction stages.

You can register callback functions for the following events:
onChange(): Invoked when the input value in the hosted field in the iFrame has changed.
onFocus(): Invoked when the hosted field in the iFrame has gained focus.
onBlur(): Invoked when the hosted field in the iFrame has lost focus. Once the payer has finished typing and leaves the field, and this event is triggered, invoke the validate() function and display any errors for the field from the validate() function’s callback.
onMouseOver(): Invoked when a mouse over event occurs in the hosted field.
onMouseOut(): Invoked when a mouse out event occurs in the hosted field.
onValidityChange(): Invoked after the payer’s each keystroke, providing feedback on the validity of the payer’s data entry so far.

Regardless of how you handle the hosted field events above, you must expect and handle errors from the formSessionUpdate() session configuration callback. While the validate() function can indicate validity, the formSessionUpdate() validation is more comprehensive and can detect additional errors.
Form Session update example for system error and timeout response
PaymentSession.onBlur( ["card.number", "card.nameOnCard", "card.securityCode", "card.expiryYear", "card.expiryMonth"],

function(selector, role)

{
  PaymentSession.validate('card',
  function(allresult) {

    if (allresult.card[role].isValid) {

      console.log("The field is valid");
      document.querySelector(selector).style.borderColor = "green";

    } else {

      console.log("The field is invalid");

      document.querySelector(selector).style.borderColor = "red";

    }
  });
  PaymentSession.onFocus(['card.number', 'card.securityCode'],
  function(selector) {
    //handle focus event
  });
  PaymentSession.onChange(['card.securityCode'],
  function(selector) {
    //handle change event
  });
  PaymentSession.onMouseOver(['card.number'],
  function(selector) {
    //handle mouse over event
  });
  PaymentSession.onMouseOut(['card.number'],
  function(selector) {
    //handle mouse out event
  });

  PaymentSession.onValidityChange(["card.number", "card.nameOnCard"],
  function(selector, result) {

    if (result.isValid) {

      console.log("The field value is valid");

      document.querySelector(selector).style.borderColor = "green";

    } else if (result.isIncomplete) {
      console.log("The field value is not yet valid");
      document.querySelector(selector).style.borderColor = "grey";
    } else {

      console.log("The field value is invalid");

      document.querySelector(selector).style.borderColor = "red";

    }
  }
  );
Frequently asked questions
How do I handle the event where a card type entered by the payer is not supported on my merchant profile?
To handle this event, first use the PAYMENT OPTIONS INQUIRY operation to get a list of supported card types. Then inspect the card type information (sourceOfFunds.provided.card.brand and sourceOfFunds.provided.card.scheme) in the PaymentSession.updateSessionFromForm('card') response, validate it against the list of supported card types, and display an error message if the card type is not accepted.


How do I know whether the payer's CSC or CVV is needed and has been provided?
To find out whether CSC or CVV is required, use the PAYMENT OPTIONS INQUIRY operation. If the payer does not provide CSC/CVV, the securityCode field is NOT returned in the PaymentSession.updateSessionFromForm('card') response. If you require a CSC/CVV and no value is present, you need to display an error to the payer.


Do event callbacks for hosted fields work on all browsers?
There are known issues with event callbacks on the following operating systems and browsers:
Internet Explorer 11 on Windows 10: If interaction.displayControl.formatCard=EMBOSSED, the onChange() event is not triggered when you change the value of a hosted field.
iOS9 on iPhone 6+: The onChange() and onBlur() events are not triggered when the payer enters data in a hosted field and touches another field in the payment page. Further, the payer cannot navigate from hosted fields to other fields on the payment page and vice versa.


Interpret the Transaction Response
When you send a transaction request to the Mastercard Gateway, you receive a response within a short interval. To determine the success of your transaction, as well as obtain other important data from the transaction response, you need to decode and parse the transaction response. When you know the result for the transaction, it is good practice to display that and a receipt of some kind to your payer on your payment page.

Spend some time examining the transaction response fields for each relevant operation in the API Reference. All the fields provide valuable information, and you probably want to store some of them locally for accounting, reconciliation, and traceability reasons. The more complex your integration is, the more useful it can be to study specific response codes to identify all aspects of the transaction status.

It is good practice to validate whether the data you supplied for the transaction is the same as the data used to process the transaction. For example, check that the amount returned in the transaction response matches the value you sent in the request.
Sample transaction response
This topic includes various sample code snippets. Select the protocol and language that you want to use and select Update Code Snippets to change all the snippets in this topic.

This page includes sample code snippets. Choose an interface and language, then click Update Code Snippets.
Protocol: 
REST-JSON
 Language 
Java
 
Decode the response (REST, JAVA)  Change
When you receive the response to your transaction, it is encoded or formatted in the same format as the transaction request. To make this data more accessible, decode it and store it in an array or similar.

Parse the response (REST, JAVA)  Change
Once you decode the transaction response and store it in an easily accessible object, you can parse the data to retrieve any fields that you need.

All API operations contain a result field in the response. This field indicates the overall result and status of your transaction. Use it to determine different processing options within your app. For example, if the transaction result value is a SUCCESS, you can record it as being processed successfully. If the result is a FAILURE, you can look further at the transaction response to determine whether the payer must retry the transaction or whether you must execute another process within your app.
The following code snippet shows how to parse a field from the decoded transaction response.

  public static String getJsonFieldValue(String jsonFieldName, String resp) {
    jsonFieldName = "\"" + jsonFieldName + "\":";
    String jsonFieldValue = null;
    int index = resp.indexOf(jsonFieldName);
    if (index != -1) {
      int startIndex = index + jsonFieldName.length() + 1;
      int endIndex = resp.indexOf("\"", startIndex);
      jsonFieldValue = resp.substring(startIndex, endIndex);
    }
    return jsonFieldValue;
  }
Frequently asked questions
What should I do if I do not receive a response?
When you do not receive a response, wait for 60 seconds and attempt to resubmit an identical request. If the gateway has received the original request and the new one is a duplicate, the bank transaction is not repeated, and no duplicate funds are transferred. You receive the same response as you would have received for the first request.

How do I know if a transaction has been approved?
All approved transactions are represented with a Transaction Response Code value of APPROVED from the gateway (see the response.gatewayCode field in your transaction response). Any other code represents a declined or failed transaction.


Customizing the Hosted Fields
If you are using the Hosted Session integration method, you have various ways of customizing the hosted payment fields on your payment page. The customizations can help you match the look and feel of your payment page and improve your web site accessibility.

Styling hosted fields
You can style hosted payment fields to match the look and feel of your overall payment page.

You can invoke the following functions in the
Session JavaScript library
(session.js) for styling payment fields:
setFocus( ): Sets focus on the specified hosted field.
setFocusStyle( ): Sets the styling attributes for the specified hosted fields when they gain focus.
setHoverStyle( ): Sets the styling attributes for the specified hosted fields when a mouse hover occurs over them.
setPlaceholderStyle( ): Sets the styling attributes for the placeholder text displayed on the specified hosted fields before the payer replaces it with their own entry.
setPlaceholderShownStyle( ): Sets the styling attributes for the specified hosted fields when the placeholder text is visible.
Payment field styling example
PaymentSession.setFocus('card.number');
    
PaymentSession.setFocusStyle(["card.number","card.securityCode"], {
  borderColor: 'red',
  borderWidth: '3px'
});

PaymentSession.setHoverStyle(["card.number","card.securityCode"], {
  borderColor: 'red',
  borderWidth: '3px'
});

PaymentSession.setPlaceholderStyle(["card.number", "card.nameOnCard"], {
  color: 'blue',
  fontWeight: 'bold',
  textDecoration: 'underline'
});
PaymentSession.setPlaceholderShownStyle(["card.number", "card.nameOnCard"], {
  color: 'green',
  fontWeight: 'bold',
  textDecoration: 'underline'
});
Using drop-down fields
If you are supporting credit card payments, you can use drop-down values for the hosted fields defining the card expiry month and year.

The following sample code shows how to define the drop-down fields within your payment page’s hosted fields for a credit card payment.

Drop-Down Field Example

<html>
<head>
<!-- INCLUDE SESSION.JS JAVASCRIPT LIBRARY -->
<script src="https://test-seylan.mtf.gateway.mastercard.com/form/version/72/merchant/<MERCHANTID>/session.js"></script>
<!-- APPLY CLICK-JACKING STYLING AND HIDE CONTENTS OF THE PAGE -->
<style id="antiClickjack">body{display:none !important;}</style>
</head>
<body>

<!-- CREATE THE HTML FOR THE PAYMENT PAGE -->

<div>Please enter your payment details:</div>

<div>Card Number: <input type="text" id="card-number" class="input-field" title="card number" aria-label="enter your card number" value="" tabindex="1" readonly></div>

<div>Expiry Month: 
<select id="expiry-month" class="form-control input-md" required="" readonly>
	<option value="">Select Month</option>
	<option value="01">January</option>
	<option value="02">February</option>
	<option value="03">March</option>
	<option value="04">April</option>
	<option value="05">May</option>
	<option value="06">June</option>
	<option value="07">July</option>
	<option value="08">August</option>
	<option value="09">September</option>
	<option value="10">October</option>
	<option value="11">November</option>
	<option value="12">December</option>
</select>
</div>
<div>Expiry Year: 
<select id="expiry-year" class="form-control input-md" required="" readonly>
	<option value="">Select Year</option>
	<option>21</option>
	<option>22</option>
	<option>23</option>
	<option>24</option>
	<option>25</option>
	<option>26</option>
	<option>27</option>
	<option>28</option>
	<option>29</option>
	<option>30</option>
	<option>31</option>
	<option>32</option>
	<option>33</option>
	<option>34</option>
	<option>35</option>
	<option>36</option>
	<option>37</option>
	<option>38</option>
	<option>39</option>
</select>
</div>
<div>Security Code:<input type="text" id="security-code" class="input-field" title="security code" aria-label="three digit CCV security code" value="" tabindex="4" readonly></div>

<div>Cardholder Name:<input type="text" id="cardholder-name" class="input-field" title="cardholder name" aria-label="enter name on card" value="" tabindex="3" readonly></div>

<div><button id="payButton" onclick="pay();">Pay Now</button></div>


</script>
</body>
</html>
	
Configure accessibility
The Hosted Session provides functionality to improve the accessibility of your web site. For more information on web site accessibility, see the WCAG 2 Overview.

Setting the payment page language
To set the language of your overall payment page, add the lang attribute to the <html> element. Defining the page language helps assistive technologies render the text more accurately.


<html lang="en">
    <head></head>
    <body></body>
</html>
Setting the hosted field locale
To define the locale (language and region) of your hosted fields, add the locale argument to the PaymentSession.configure() function used to configure your session.

When you define the hosted field locale, the Session JavaScript library provides applicable translations for all the textual elements related to the hosted fields, including hidden labels and error messages. If the locale is not set, it defaults to English (en_US).

The supported locale values are de_DE, el_GR, en_US, es_MX, es_ES, fr_CA, fr_FR, it_IT, ja_JA, pl_PL, pt_BR, ro_RO, and zh_CN.

To avoid confusing your payers, make sure that the language of the payment page (lang attribute) matches the locale of the hosted fields.

PaymentSession.configure({
    fields: {
        card: {
            nameOnCard: cardHolderNameField ? "#card-holder-name" : null,
            number: "#card-number",
            securityCode: "#security-code",
            expiryMonth: "#expiry-month",
            expiryYear: "#expiry-year"
        }
    },
    frameEmbeddingMitigation: ["javascript"],
    locale:"fr",
        callbacks: {
    }
});
Improving user experience for hosted fields
The following options allow you to better control the user experience for payers with accessibility needs:

Setting the iFrame title
The hosted field's iFrame title attribute can be controlled using the title attribute on the field. The title represents advisory information for the field, such as a tooltip.

Setting ARIA (Accessibility Rich Internet Application) attributes
The Hosted Session supports various aria-* attributes, which you can use to allow assistive technologies help the payer. For example, the aria-label attribute provides a label that assistive technology can read to identify the hosted field for the payer.

Setting the display parameter for invalid characters
Consider accepting all characters in hosted fields for a better user experience when using assistive technology. To do this, set interaction.displayControl.invalidFieldCharacters=ALLOW within the configuration object argument of the PaymentSession.configure() function.

Setting hidden label and error messages
All hosted fields contain a hidden label and all mandatory hosted fields contain a hidden error message. Any errors resulting from invoking the PaymentSession.updateSessionFromForm() function raise an error message label. You can additionally raise your own errors using the PaymentSession.setMessage() function.

For example, the hidden label for the card number field is Card Number. The hidden error message for missing card number is Card Number is missing, please enter the value. The hidden error message for invalid card number is Card Number is invalid, please enter correct value. While tabbing between the hosted fields, the screen reader reads only the hidden label and hidden error message, not the actual label or error message displayed on the page.

Hosted Field Accessibility Example
<!-- CREATE THE HTML FOR THE PAYMENT PAGE -->
<div>Please enter your payment details:</div> 

<div>Cardholder Name: <input type="text" id="cardholder-name" class="input-field" title="cardholder name" aria-label="enter name on card" value="" tabindex="1" readonly></div>

<div>Card Number: <input type="text" id="card-number" class="input-field" title="card number" aria-label="enter your card number" value="" tabindex="2" readonly></div>

<div>Expiry Month:<input type="text" id="expiry-month" class="input-field" title="expiry month" aria-label="two digit expiry month" value="" tabindex="3" readonly></div>

<div>Expiry Year:<input type="text" id="expiry-year" class="input-field" title="expiry year" aria-label="two digit expiry year" value="" tabindex="4" readonly></div>

<div>Security Code:<input type="text" id="security-code" class="input-field" title="security code" aria-label="card security code" value="" tabindex="5" readonly></div>

<div><button id="payButton" onclick="pay();">Pay Now</button></div> 
Handling field focus
The default HTML5 auto-focus behavior does not work with hosted fields: when the payer clicks the label, focus is not automatically moved to the corresponding input element.

To ensure correct focus functionality on your page, use the setFocus() function of the Session JavaScript library.


Subsequent Operations
When using the Hosted Session integration method, the payment process for a new order starts with an initial transaction, most often a PAY or AUTHORIZE transaction. For a full list of available initial transactions, see Transactions.

The initial transaction defines all important information for the order, it includes:

Details about the order itself, such as, ID, amount, and currency.
Payment method to be used for the payment.
Payment details of the payer.
If you are using a PAY transaction and the payer receives the goods they ordered and is happy with them, the order is complete and no other actions are needed. However, in many scenarios subsequent transactions can be needed to handle the remaining lifecycle of the order.

Subsequent scenarios
The following scenarios are examples of situations where you need to send subsequent transactions for your existing order:

If you use a VERIFY transaction, often created with the order amount set to zero, as the initial transaction to verify the payer's account details, you need to follow up with a PAY or AUTHORIZE transaction to define the correct order amount and initiate the money transfer.
If you use an AUTHORIZE transaction as the initial transaction, you need to follow up with a CAPTURE transaction, when you are ready to ship the goods and want the money to exchange hands. If there is a delay in your ability to ship the goods, you may also need to use the UPDATE AUTHORIZATION transaction to keep the authorization active until you are ready to capture it.
If the order is cancelled for any reason, you need to use the VOID transaction to immediately cancel it with the gateway as well. If the payment details have already been sent to the bank, you need to use the VOID transaction to immediately cancel it with the gateway as well. If the payment details have already been sent to the bank, you need to use the REFUND transaction, which is also needed if the payer is not happy with their purchase and wants to return it. In the rare event that the transaction fails because the acquirer requires further authorization, you can use a REFUND transaction, which is also needed if the payer is not happy with their purchase and wants to return it. In the rare event that the transaction fails because the acquirer requires further authorization, you can use a REFERRAL transaction to retry the payment operation with the necessary additional details.
The RETRIEVE TRANSACTION and RETRIEVE ORDER API operations can also be considered subsequent transactions, though they are used only to retrieve details of an existing order, and do not impact the order lifecycle. For a list of all available subsequent transactions, see Transactions.

Linking to initial transaction
All the transactions related to the same order must be linked so that the various payment systems like the Mastercard Gateway and banks can identify them as belonging together. The linking is done by using the same order ID in every transaction related to the order. The order ID is provided as a path parameter in the request URL.

Shared data in subsequent transactions
Linking different transactions together within the same order means that you only need to provide specific data about the order once. The gateway stores the details for the order and can use them as needed, when processing any subsequent transactions.

In any subsequent transaction, you only need to provide the data specific to that transaction. For example:

In a CAPTURE transaction, provide the amount and currency for the goods you are shipping at that point, which may be the full or partial order amount.
In a REFUND transaction, provide the amount and currency for the refund you are sending, which may be the full or partial order amount.
In a VOID transaction, provide the transaction ID of the exact transaction you want to cancel.
In a REFERRAL transaction, provide the authorization code that allows the issuer to approve the previously failed transaction.
If you provide identical information in multiple transactions within an order, the gateway ignores it. If you update any information in a subsequent transaction, the gateway updates the order details accordingly. For example, you have first provided a shipping address in the initial AUTHORIZE transaction, and the payer moves. You can then add a new shipping address to the CAPTURE transaction.


Testing Steps
Careful testing is the cornerstone of software development, ensuring it operates as expected. You cannot move on to a live environment and handle real payments until you have confirmed that your integration works as desired in all scenarios.

Prerequisites
Before you start testing your Hosted Session integration, you must complete:

Basic integration using sessions and hosted fields to gather payment details.
Any customizations you want to make to the hosted fields on your payment page.
Integration for any subsequent operations you want to handle within your order lifecycles.
Any customizations related to the payment methods you want to support.
All additional features and security-related functionality you need.
Testing your integration
Cover at least the following steps in your testing:

For the payment methods you support, test all individual operations you want to use in your integration where payer interaction is needed on the hosted payment fields to store the necessary details into the session. Test the process from creating the session to providing the hosted fields, updating the session with the field values, and finally sending the payment transaction using the session.
Test that any customizations you have made for the hosted fields work as expected.
For the payment methods you support, determine the payment flows or combinations of initial and subsequent transactions you want to be able to use in your integration. Test all the flows with all possible combinations of subsequent transactions.
Test all the additional features and security-related functionality you are using.
Confirm that your system reacts appropriately and overcomes all common error scenarios related to invalid requests and server problems.
Determine the transaction responses that require further actions from you, and test that your integration is taking expected actions.
Testing tools
To test your integration, the Mastercard Gateway provides some helpful tools:

Simulators: You can test your requests using various simulators, which you access from your test merchant account. To confirm that you are using your test merchant account, check that the merchant ID supplied by your payment service provider has the prefix "TEST". All requests sent with the test merchant ID are regarded test requests and handled by the simulators. They are not sent forward to actual providers, issuers, and acquirers.
If you already have a merchant ID that has the "TEST" prefix, that is your test merchant account, your payment service provider sends you another merchant ID when you are ready to process live transactions.
The test merchant account is a wholly separate account with a different API password or certificates from your regular account. When switching from one to the other, make sure to change both your merchant ID and any authentication credentials.
For more information on specific simulator features and options, see the test instructions within specific payment methods.

Test cards: If you support card payments as payment methods, the gateway provides test cards to enable you to test various scenarios, including 3D Secure authentication. For more information, see Test Cards and Testing Your Integration for 3DS Authentication.
Predictable response results: The test simulator is configured to generate predictable results based on the transaction request and the card details you supply. For more information, see Test Cards. You can trigger transaction responses that contain a specific Mastercard Gateway Response Code or Card Security Code validation result, as well as Address Verification response code, and ensure that your integration reacts appropriately to each.
Additional logging for testing purposes: To support additional logging while testing your Hosted Session integration using a TEST merchant ID, append ?debug=true to the URL when including the Session JavaScript library on your payment page.

<html>
<head> 
<script type="text/javascript" src="https://test-seylan.mtf.gateway.mastercard.com/form/version/<version>/merchant/<merchant_ID>/session.js?debug=true"></script>
</head>
</html>


Test Cards
When testing your Mastercard Gateway integration for card payments, you can trigger specific responses and results for your transaction operations using various test cards. When accessing a card emulator, use your test merchant profile with the "TEST" prefix that your payment service provider supplies.

Card transaction test details
Following are the different card transaction test details.

Standard test cards – all supported regions
Use the following standard test cards unless specific cards for your acquirer and region are provided in the other sections.

You can use different expiry dates, CSC/CVV values, and the billing address street names in the request to generate different responses.

UATP cards do not support CSC/CVV and 3DS.
Please note that "3-D Secure Enrolled" means 3DS is supported for testing these cards with authentication.channel=PAYER_BROWSER in the INITIATE_AUTHENTICATION API, but not with other channels.

To test the 3D Secure authentication functionality in more detail and using the 3DS emulator, see testing your 3DS integration.

Standard test cards

Test Cards	Card Number
Mastercard
5123450000000008
2223000000000007
5111111111111118
2223000000000023
Visa
4508750015741019
4012000033330026
American Express (AMEX)
371881634498004
371881127160004
371881245560002
371881911767006
Diners Club
30123400000000
36259600000012
JCB
3528000000000007
3528111100000001
Discover	6011003179988686
6011963280099774
Maestro	5000000000000000005
5666555544443333
UATP
(UATP cards do not support CSC/CVV and 3DS)	135492354874528
135420001569134
UnionPay
3DS enrolled	6201089999995464
6201089999991455
6201089999994020
6201089999999300
6201089999994749
UnionPay
Non-3DS enrolled	6214239999999611
6214239999999546
PayPak	220546000000311
2205460000005210
220553000000895
2205530000000278
Jaywan 3DS enrolled	6690109900000010
6690109000011008
6690109000011016
6690109000011024
6690109000011032
Jaywan 3DS not enrolled	6690109000011057
6690109000011065
Mada Mastercard	5297410588409146
5433579999990250
5433570000000008
Mada Visa	4228180191362993
4860940000000008
4860940000000024
Mada Only	9682090000000007
8736469999990336
9682090000000031
Transaction responses for standard test cards

Expiry Date	Transaction Response Gateway Code
01/39
APPROVED
05/39
DECLINED
04/27
EXPIRED_CARD
08/28
TIMED_OUT
01/37	ACQUIRER_SYSTEM_ERROR
02/37	UNSPECIFIED_FAILURE
05/37	UNKNOWN
CSC/CVV responses for standard test cards

CSC/CVV	CSC/CVV Response Gateway Code
100
MATCH
101
NOT_PROCESSED
102
NO_MATCH
For American Express cards
1000	MATCH
1010	NOT_PROCESSED
1020	NO_MATCH
AVS responses for standard test cards

Billing Address Street	AVS Response Gateway Code
Alpha St
ADDRESS_MATCH
Gamma St
NOT_VERIFIED
November St
NO_MATCH
Romeo St
SERVICE_NOT_AVAILABLE_RETRY
Sierra St
SERVICE_NOT_SUPPORTED
Uniform St
NOT_AVAILABLE
Whiskey St
ZIP_MATCH
X-ray St
ADDRESS_ZIP_MATCH
Kilo St	NAME_MATCH
Oscar St	NAME_ADDRESS_MATCH
Lima St	NAME_ZIP_MATCH
Zero St	NOT_REQUESTED
NPCI BEPG Mastercard Gateway internal simulator
To access the Mastercard Gateway test simulator, enter "TEST" as a prefix to the Merchant ID supplied by your payment service provider. If the Merchant ID supplied already has "TEST" as the first four letters, you are already using the test simulator, and your payment service provider sends you another Merchant ID when you are ready to process live transactions.

The test simulator is configured to generate predictable results based on the transaction request and card details you supply.

Refer the following cards for Seamless flow and Alternate Identifier (Alt ID).

Use Cryptogram = AJgBASOERgAgIwYgEwcpAAAAAAE for Alt ID, also known as Guest checkout transaction
Card expiry date and CVV
Expiry	CVV
05/28
111
 

Rupay Test Cards according to the Use Case/Scenario
Rupay Use Case/Scenario	Authentication Mode	Card Number	Cryptogram	OTP
Non-SI transaction for signed-in customers
Redirection	6074849200004917	APJUR+bB46ysAAKYEAOYGgADFA==	123456
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	123456
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	12345
Guest Checkout
Redirection	6074849200004917	AJgBASOERgAgIwYgEwcpAAAAAAE	123456
Seamless	6074849900004936	AJgBASOERgAgIwYgEwcpAAAAAAE	123456
Wrong OTP generation
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	NA
OTP verification Fails
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	1236
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	1235
Seamless	6074849900004936	APJUR+bB46ysAAKYEAOYGgADFA==	123456


Test Your Integration
You can validate your 3DS Authentication integration by using the 3DS Emulator provided by the payment gateway. To begin testing, log in with your test merchant profile. This profile should include the "TEST" prefix, as supplied by your payment service provider.

The emulator supports a variety of test card scenarios to simulate different 3DS outcomes. These test cards do not replicate the behavior of Access Control Servers (ACS).

The gateway supports 3DS testing for both browser-based (web authentications) and SDK/in-app channels (mobile integrations) channels. This guide covers the following topics:

Browser-based 3DS testing
Mobile integration 3DS testing
FAQs
Test 3DS functionality: Browser integration
Follow these steps to test 3DS functionality:

Use a test card from the 3DS Test Cards table when submitting the INITIATE AUTHENTICATION request for your TEST merchant profile.
Use the expiry code "01/39" to get a successful authorization or payment in an end-to-end testing flow.
Set authentication.channel = PAYER_BROWSER and authentication.purpose = 'PAYMENT_TRANSACTION'.
Check if the authentication is available (authentication.version=3DS2).
Submit an AUTHENTICATE PAYER request.
Insert the contents of the authentication.redirect.html field into the page displayed to the payer, which redirects the payer's browser to the 3DS Emulator challenge page.
The 3DS Emulator redirects the payer's browser back to your website when the authentication is complete.
Select a specific 3DS authentication result from the drop-down menu in the 3DS Emulator. See the values in the following Transaction Status Options in the 3DS Emulator table.
Select a successful authentication result if you want to reference this authentication transaction in a subsequent AUTHORIZE or PAY request and want the financial transaction to be successful.
Use the transaction ID for this 3DS authentication in the authentication.transactionId field of a subsequent AUTHORIZE or PAY transaction request.
Browser integration 3DS test cards
In the table,

The ACS Method Call column defines whether the card supports the ACS method.
The transStatus and transStatusReason columns define the values returned in the authentication.3ds2.transactionStatus and authentication.3ds2.statusReasonCode fields, respectively.
The following table lists the cards you can use to test the 3DS functionality.

Test Cards	Purpose	Card Number	3DS2 Enrolled	ACS Method Call	tranStatus	tranStatusReason	ECI	Authentication Token
Mastercard	Challenge	5123450000000008
2223000000000007	Yes	Yes	C	-	-	-
Frictionless	5123456789012346	Yes	Yes	Y	-	02	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless - No Method	5555555555000018	Yes	No	Y	-	02	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Authentication Attempted	5500005555555559	Yes	No	A	-	01	nHyn+7YFi1EUAREAAAAvNUe6Hv8=
Authentication Rejected	5506900140100503	Yes	No	R	04	-	-
Error during INITIATE AUTHENTICATION operation resulting in Generic Error Response	5210760000000004	Exception	-	-	-	-	-
Error during AUTHENTICATE PAYER operation resulting in Generic Error Response	5455031257390496	Yes	No	Exception	-	-	-
5455031252665454	Yes	No	Exception	-	-	-
Authentication Unavailable Error during Authenticate Payer operation resulting in a response of authenticationStatus = AUTHENTICATION_UNAVAILABLE	5123459999998221	Yes	No	Recoverable Exception	-	-	-
Visa	Challenge	4440000009900010	Yes	No	C	-	-	-
Frictionless	4440000042200014	Yes	Yes	Y	-	05	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Authentication Attempted	4440000042200022	Yes	No	A	-	06	nHyn+7YFi1EUAREAAAAvNUe6Hv8=
American Express	Challenge	371881733404002	Yes	No	C	-	-	-
Frictionless	371881887105009	Yes	Yes	Y	-	05	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Maestro	PSD2 Exemptions and Trusted Merchants	5000000000000000005	Yes	No	No	81	06	kNyn+7YFi1EUAREAAAAvNUe6Hv8=
UnionPay 3-D Secure	Frictionless	6201089999995464	Yes	Yes	Y	-	05	ABCQAwUANHQYQoQYARWTUEFnAAA=
Challenge	6201089999991455	Yes	Yes	C	-	-	-
Challenge - 19 digit card	6213249999999991208	Yes	Yes	C	-	-	-
Authentication Attempted	6201089999994020	Yes	No	A	-	06	ABCQAwUANHQYQoQYARWTUEFnAAA=
Authentication Unavailable	6201080999990852	Yes	No	U	01	07	-
Not authenticated	6201080999990423	Yes	No	N	04	-	-
JCB	Challenge	3528249999991755	Yes	Yes	C	-	-	-
Challenge - No Method	3528249999991748	Yes	No	C	-	-	-
Frictionless	3528249999991821	Yes	Yes	Y	-	05	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Authentication Rejected	3528249999981236	Yes	Yes	R	-	-	-
Diners	Challenge	3600000000000115	Yes	Yes	C	-	-	-
Challenge - No Method	3600000000000123	Yes	No	C	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	3600000000000131	Yes	Yes	Y	-	05	AAICBycxlQAAAAAAGTGVAAAAAAA=
Frictionless	36721601220030	Yes	Yes	Y	-	05	AJkBBGBIJGhlhpFBFEgkAAAAAAA=
Authentication Rejected	3600000000000172	Yes	Yes	R	-	-	-
Discover	Challenge	6445644564456445	Yes	Yes	C	-	-	-
Challenge - No Method	6445644564456460	Yes	No	C	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	6445644564456411	Yes	Yes	Y	-	05	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	6587060001006370	Yes	Yes	Y	-	05	AJkBBGBIJGhlhpFBFEgkAAAAAAA=
Authentication Rejected	6445644564456155	Yes	Yes	R	-	-	-
Jaywan mono-badge test cards	Frictionless	6690109000011008	Yes	Yes	Y	-	05	ABCQAwUANHQYQoQYARWTUEFnAAA=
Challenge	6690109900000010	Yes	Yes	C	-	-	-
Challenge - No Method	6690109000011008	Yes	No	Y	-	05	ABCQAwUANHQYQoQYARWTUEFnAAA=
Authentication Attempted	6690109000011024	Yes	Yes	A	Not present	06	ABCQAwUANHQYQoQYARWTUEFnAAA=
Authentication Unavailable	6690109000011032	Yes	No	U	01	07	not present
Not authenticated	6690109000011040	Yes	Yes	N	04	not present	not present
Jaywan Co-badge Mastercard	Frictionless	5175540000050008	Yes	Yes	Y	Not Present	02	ABCQAwUANHQYQoQYARWTUEFnAAA=
Challenge	5175540000050099	Yes	Yes	C	-	-	-
Jaywan Co-badge Jaywan	Frictionless	5175540000050008	Yes	Yes	Y	Not Present	05	ABCQAwUANHQYQoQYARWTUEFnAAA=
Challenge	5175540000050099	Yes	Yes	C	-	-	-
Jaywan Co-badge Visa	Frictionless	4439130000050003	Yes	Yes	Y	-	05	ABCQAwUANHQYQoQYARWTUEFnAAA=
Challenge	4439130000050011	Yes	Yes	C	-	-	-
PayPak	Frictionless	2205939999992560
Yes	Yes	Y	-	02	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	2205789999999978
2205729999994371	Yes	No	Y	-	02	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Challenge	2205459999997832
2205439999999541	Yes	Yes	C	-	-	-
Challenge - No Method	2205589999999485
2205819999992101	Yes	No	C	-	-	-
Authentication Attempted	2206409999999295	Yes	No	A	-	01	nHyn+7YFi1EUAREAAAAvNUe6Hv8=
Authentication Rejected	2206389999998630	Yes	No	R	04	-	-
Error during INITIATE AUTHENTICATION operation resulting in Generic Error Response	2205919999999930	Exception	-	-	-	-	-
Error during AUTHENTICATE PAYER operation resulting in Generic Error Response	2205609999999655	Yes	No	Exception	-	-	-
Authentication Unavailable Error during Authenticate Payer operation resulting in a response of authenticationStatus = AUTHENTICATION_UNAVAILABLE	2205689999997123	Yes	No	Recoverable Exception	-	-	-
ITMX Co-badge Mastercard	Frictionless v2.2.0	5391979999999014	Yes	No	Y	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	5594509999999006	Yes	Yes	Y	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Challenge	5297649999999000	Yes	No	C	-	-	-
Authentication Attempted	5391979999999048	Yes	No	A	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Not Authenticated	5391979999999055	Yes	No	N	04	-	-
ITMX Co-badge Visa	Frictionless v2.2.0	4013679999999011	Yes	No	Y	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Frictionless	4215849999999008	Yes	No	Y	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Challenge	4943129999999004	Yes	No	C	-	-	-
Authentication Attempted	4013679999999045	Yes	No	A	-	-	mHyn+7YFi1EUAREAAAAvNUe6Hv8=
Not Authenticated	4013679999999052	Yes	No	N	04	-	-
For a "C" transStatus, the following table lists the options that are available on the drop-down menu in the 3DS Emulator and the resulting values in the response.

Options	transStatus	challengeCancel	eci
Successful authentication
Y	-	05 / 02
Failed authentication
N	-	07 / 00
Cancelled authentication
N	01	07 / 00
Unable to authenticate	U	-	07 / 00
Authentication rejected	R	-	07 / 00
Test 3DS functionality: Mobile integration
Follow these steps to test 3DS functionality:

Use a test card from the following 3DS Test Cards table when submitting the INITIATE AUTHENTICATION request for your TEST merchant profile.
Use the expiry code "01/39" to get a successful authorization or payment in an end-to-end testing flow.
Set authentication.channel = PAYER_APP and authentication.purpose = 'PAYMENT_TRANSACTION'.
Check if the authentication is available (authentication.version=3DS2).
Submit an AUTHENTICATE PAYER request.
After the authentication is complete, the Mobile SDK receives a response:
Frictionless flow:
If the test card supports frictionless authentication, the Authenticate Payer response returns authenticationStatus = AUTHENTICATION_SUCCESSFUL, and you can proceed to step 6.
Challenge flow:
If the test card requires a challenge, the Authenticate Payer response returns authenticationStatus = AUTHENTICATION_PENDING while the authentication process occurs. Once the challenge is completed, the Mobile SDK provides a recommendation to your application on whether to proceed with the transaction.
Once you are ready to process your payment, use the transaction ID for this 3DS authentication in the authentication.transactionId field of a subsequent AUTHORIZE or PAY transaction request.
Mobile SDK integration 3DS test cards
Test Cards	Purpose	Card Number	tranStatus	tranStatusReason	ECI	Authentication Token
Mastercard	Frictionless	2223000000000023	Y	-	02	xgQYYgZVAAAAAAAAAAAAAAAAAAAA
Challenged-(OTP HTML)	5123450000000008	C	-	-	-
Challenged-(OTP Native)	2223000000000007	C	-	-	-
Not Authenticated	5111111111111118	N	01	0-	-
FAQs
What steps should I take when a 3DS error code is returned?
The gateway returns error messages from the authentication servers. You can use error messages to identify which fields are causing your integration to break when an authentication request is sent. For example,

Error Message:
An authentication scheme indicates that your acquirer does not onboard the authentication scheme for EMV 3DS. Contact your acquirer or PSP.
Error Cause:
Before you can start using the EMV 3DS functionality, your acquirer needs to onboard you with the respective authentication scheme. Contact your acquirer or PSP to check these values.
What should I do when there is a delay while searching for orders or transactions within the Merchant Administrator?
You can see the authentication details in the Merchant Administrator only when the payer authentication is complete. If the payer is still going through the challenge flow or abandons the process, there can be a delay before that transaction is visible on the Merchant Administration.

To see the current state of the authentication without delay, use the RETRIEVE ORDER or RETRIEVE TRANSACTION operation.


