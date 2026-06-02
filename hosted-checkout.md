Integration Steps
To implement the basic Hosted Checkout solution in your system, follow the instructions below.

Prerequisites
Before implementing a Hosted Checkout solution, check with your payment service provider to ensure you meet the following prerequisites:

Ensure that you have a merchant account and that your merchant profile is enabled for the Hosted Checkout service.
Select and set up your API authentication method.
If you want to be notified of successful payments, enable the Notifications service. It allows the Mastercard Gateway to send email or Webhook notifications to you, and email notifications to the payer on your behalf.
Implementing a Hosted Checkout solution
The Hosted Checkout solution works through API operations (requests and responses), which are used to, for example, initiate or retrieve information about various payment transactions and store card details. You also need the Checkout JavaScript library to implement the Hosted Payment Page in your app or web page, when payer participation is needed to gather payment details for a transaction.
You can use all the API operations available for the REST Server APIs. However, you have no need for the Hosted Session-related API operations, as they are only needed for the related integration method. For general information about making server API requests, see Making a Server API Request.

To perform an operation, you must first have it enabled on your merchant profile by your payment service provider. To check which operations are available for you to use, contact your payment service provider.
The operations available to you are limited to the capability of the acquirers configured on your merchant profile with the gateway. If a functionality is not supported for the acquirer on the gateway, any operation requests to execute that functionality are rejected by the gateway (for that acquirer).
When payer participation is needed, each task you perform with Hosted Checkout consists of the following steps:

Establish a checkout session
Request a checkout session using the INITIATE CHECKOUT operation.
Implement the Hosted Payment Page
Show the payer either an Embedded Page or a Payment Page and start the payment process. Optionally, include callbacks for handling events that occur during the payment interaction, such as the payer cancelling the payment, the session timing out, or redirecting the payer to another website to finish payment (such as when using PayPal).
Interpret the response
Receive the results of the payment from the gateway and update your system with the payment details. Return the payer to your web site and display the payment receipt to them.
For a collection of example requests covering the common transaction operation requests, download the Postman collection.

The API request to establish the checkout session must be made from the merchant's backend server. Do not invoke any API operation directly from the payer's browser.
After your integration is completed and you are able to manage the initial transaction with the payer using the Hosted Payment Page to provide their payment details and authorization:

Determine any customizations you need to make based on the specific payment methods you want to support on the Hosted Payment Page.
Define any customizations you want to use in the Hosted Payment PageCheckout.
Consider what kind of security or other additional features you want to offer or use in your integration.
Implement any subsequent transactions you want to initiate from your backend server, such as CAPTURE or REFUND
Test your entire solution.
Before you complete your integration, see the Frequently asked questions section for answers to some common concerns and tips.
Frequently asked questions
Hosted Checkout supports which browsers and platforms?
Hosted Checkout supports a wide range of modern browsers on desktop and mobile devices. For details about specific supported versions, refer to Supported Browsers and Platforms.

How secure is the Hosted Checkout integration?
The Hosted Checkout model is secure as it requires you to authenticate to the gateway, and the payment details collected on the Hosted Payment Page are submitted directly from the payer's browser to the gateway.

If you choose not to redirect the payer from the Hosted Payment Page back to your web site, check the notification email or log onto Merchant Administration to ensure that the order details are correct before you ship the goods or services to the payer.
How can I optimize my mobile interactions with Hosted Checkout?
If you want to offer your customers a good mobile experience for Hosted Checkout, add a meta tag named viewport to your site's page.


      <meta name="viewport" content="width=device-width, initial-scale=1">
  
Define the right viewport values for your pages and test your own site with them.


Establishing a Session
The first step of a Hosted Checkout transaction is to send an API request to the Mastercard Gateway using the INITIATE CHECKOUT operation. The request creates a checkout session in the gateway, and must include:
Details related to the PAY, AUTHORIZE, or VERIFY transaction you want to create.
Information about how the Hosted Payment Page must interact with the payer.
Instructions for completing the Hosted Payment Page process.

For all parameters and request body fields supported for the request, see Initiate Checkout.
For API v62 and earlier, use the CREATE CHECKOUT SESSION operation instead of Initiate Checkout.
For general instructions on making an API request from your backend server, see Making a Server API Request.
The following example shows a cURL code snippet for the INITIATE CHECKOUT request.

INITIATE CHECKOUT Example
URL	curl --location https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/<merchant_ID>/session'\


--header 'Content-Type: text/plain' \
--header 'Authorization: Basic <base64-encoded string of "merchant.<merchant ID>:<password>"' \
--data ' {
    "apiOperation": "INITIATE_CHECKOUT",
    "interaction":{
        "operation" :"AUTHORIZE",
        "merchant": {
           "name": "<merchant_name>"
        }
    },
    "order": {
        "currency":"USD",
        "amount": "100.00",
        "id" : "<order_ID>",
        "description": "<description_of_order>"
    }
 }
'

   
For more information about how to generate the API password, see Setting up API Credentials.
A successful INITIATE CHECKOUT response contains the session.id and successIndicator fields. Check the successIndicator field value to verify the success or failure of the payment. For details, see Obtaining the Payment Result.


Implementing the Hosted Payment Page
You have two options for implementing the Hosted Payment Page:
Embedded Page is a component that is activated within your website's existing checkout page.
Payment Page is a separate page to which the payer is redirected from your existing checkout page.

If you have originally implemented a Lightbox page (with API v62 or earlier), your payment page is a modal dialog displayed on top of your existing checkout page. The newer API versions do not directly support this implementation, but if you are migrating to a newer API version, you can use a Modal mode, which allows you to use the Lightbox as an extension of the Embedded Page.
Once a checkout session has been established, the process of implementing the Hosted Payment Page for Hosted Checkout consists of the following steps:
Create a Checkout object.
Configure the Checkout object.
Use the appropriate method of the Checkout object to start the payment process.

In addition, you can define callbacks that are triggered when the payer takes certain actions during the payment process.

The Hosted Payment Page implementation is done in your app or web site, using the Checkout JavaScript (JS) library.

Step 1: Create the checkout object
After the session has been initialized, you need to refer to the checkout.min.js file from the gateway server on your checkout page. This places a Checkout object into the global scope.

Example

<script src="https://test-seylan.mtf.gateway.mastercard.com/static/checkout/checkout.min.js" data-error="errorCallback" data-cancel="cancelCallback"></script>

              
If you are enabled for both the AUTHORIZATION and PAY operations, you must use Hosted Checkout v52 or above.
Step 2: Configure the checkout object
Call the Checkout.configure() function and pass it a JSON object that includes the session.id returned from the Initiate Checkout operation earlier.

Example

        Checkout.configure({
                      session: {
                        id: '<your_initiate_checkout_ID>'
                        }
                    });

       
In API v67 or later, the session object is the only field allowed through configure() - all other fields must be included through INITIATE CHECKOUT.
Data passed in Checkout.configure() never overwrites the data you already provided in the INITIATE CHECKOUT operation.
Step 3: Start the payment process
Start the payment process by calling one of the following methods of the Checkout object, depending on what kind of Hosted Payment Page you are implementing.

To display the checkout interaction on an Embedded Page:
Example


Checkout.showEmbeddedPage('#embed-target')
To display the checkout interaction on a Payment Page:
Example


Checkout.showPaymentPage()
HTML Code Example for Requesting an Embedded or Payment Page
Example



<html>
    <head>
<script src="https://test-seylan.mtf.gateway.mastercard.com/static/checkout/checkout.min.js" data-error="errorCallback" data-cancel="cancelCallback"></script>
        <script type="text/javascript">
            function errorCallback(error) {
                  console.log(JSON.stringify(error));
            }
            function cancelCallback() {
                  console.log('Payment cancelled');
            }
            Checkout.configure({
              session: {
            	id: '<your_initiate_checkout_session_ID>'
       			}
            });
        </script>
    </head>
    <body>
       ...
      <div id="embed-target"> </div>
      <input type="button" value="Pay with Embedded Page" onclick="Checkout.showEmbeddedPage('#embed-target');" />
      <input type="button" value="Pay with Payment Page" onclick="Checkout.showPaymentPage();" />
       ...
    </body>
</html>
HTML Code Example for Using the Modal Mode
Example



<html lang="en">
    <head>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">


    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous">

    <title>Hello, world!</title>
  </head>
    <body>
        <h1>Hello, world!</h1>


        <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal">
          Launch demo modal
        </button>


        <div class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Modal title</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div class="modal-body">
                  <div id="hco-embedded">
                  </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary">Save changes</button>
              </div>
            </div>
          </div>
        </div>


        <script src="https://code.jquery.com/jquery-3.6.0.slim.min.js" integrity="sha256-u7e5khyithlIdTpu22PHhENmPcRdFiHRjhAuHcs05RI=" crossorigin="anonymous"></script>


        <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.min.js" crossorigin="anonymous"></script>


        <script src="https://test-seylan.mtf.gateway.mastercard.com/static/checkout/checkout.min.js" ></script>
<script>
            // Configure Checkout first
            Checkout.configure({
                session: {
                    id: "<your_initiate_checkout_ID>"
                }
            })
            // after the modal is shown, then call Checkout.showEmbeddedPage('#hco-embedded')
                       $('#exampleModal').on('shown.bs.modal', function (e) {

                         Checkout.showEmbeddedPage('#hco-embedded',

                             () => { $('#exampleModal').modal() } // tell Checkout how to launch the modal

                         )

                       });



                     $('#exampleModal').on('hide.bs.modal', function (e) {

                      sessionStorage.clear(); // tell Checkout to clear sessionStorage when I close the modal

                      });
        </script>
      </body>
      </html>

Step 4: Implementing callbacks
Callbacks are provided to handle events that can occur during the payment interaction. Using callbacks is optional, but if you need them, you must define them in the body of the same <script> tag that references checkout.min.js.

All defined callbacks must have an implementation. They are invoked when the relevant event is triggered. The following code sample shows an example of a callback (triggered if the payer cancels the payment) being defined and implemented on a page.

Callback Example


<script src="https://test-seylan.mtf.gateway.mastercard.com/static/checkout/checkout.min.js"
         data-cancel="cancelCallback"
         data-beforeRedirect="Checkout.saveFormFields"
         data-afterRedirect="Checkout.restoreFormFields">
</script>

<script>
     function cancelCallback() {
          confirm('Are you sure you want to cancel?');
         // code to manage payer interaction
    }
// or if you want to provide a URL:
// cancelCallback = "someURL"
</script>
There are two types of callback methods: basic callbacks and redirect callbacks.

Basic callbacks
Basic callbacks are provided for the following events:
cancel: When the payer cancels the payment interaction.
The cancel callback can only be used with a Payment Page, it does not work with an Embedded Page.
error: When an error is encountered.
complete: When the payer completes the payment interaction.
timeout: When the payment is not completed within the duration available to the payer to make the payment.
These callbacks can be defined as functions, as in the example above, or as URLs. If you provide a URL instead of a function in a callback, the payer is redirected to this URL when the event is triggered.

Redirect callbacks
Since Hosted Checkout supports payment interactions that require the payer to be redirected away to other web sites to progress the payment, such as PayPal, callbacks are provided to manage what happens before the redirect and after the return to Hosted Checkout to finalize transaction processing:
beforeRedirect: Before the payer is presented with the payment interface. Returns data required to restore the payment interface state for use by afterRedirect.
afterRedirect: When the payer returns from completing the payment interaction. Uses the data saved by beforeRedirect to return the saved payment interface state.

The Checkout object also provides two functions to help you implement the beforeRedirect and afterRedirect callbacks:
saveFormFields(): Saves all current form fields for use by restoreFormFields(). Use in your beforeRedirect implementation or implement beforeRedirect as Checkout.saveFormFields().
restoreFormFields(): Restores form fields saved by saveFormFields(). Use in your afterRedirect implementation or implement afterRedirect as Checkout.restoreFormFields().

Frequently asked questions
What should I do if Hosted Checkout returns an error?
Hosted Checkout can return a number of integration errors. See Testing Steps for more information about testing and errors.

Why am I getting an error page instead of the Hosted Payment Page?
An error page displays when an incorrect Hosted Checkout request is attempted. Common causes for errors include:
Missing mandatory fields.
URLs provided in the request not being absolute.

What happens if the payer double-clicks the Pay button?
If the payer double-clicks the Pay button, that is, submits the payment twice, then the transaction is not repeated with your or the payer's bank.


Subsequent Operations
When using the Hosted Checkout integration method, the payment process for a new order starts with an initial transaction (PAY, AUTHORIZE, or VERIFY).

The initial transaction defines all the important information for the order:

Details about the order itself (such as ID, amount, and currency)
Payment method to be used for the payment
Payment details of the payer
If you are using a PAY transaction and the payer receives the goods they ordered and is happy with them, the order is complete and no other actions are needed. However, in many scenarios subsequent transactions can be needed to handle the remaining lifecycle of the order.

Subsequent scenarios
The following scenarios are examples of situations where you need to send subsequent transactions for your existing order:

If you use a VERIFY transaction (often created with the order amount set to zero) as the initial transaction to verify the payer's account details, you need to follow up with a PAY or AUTHORIZE transaction to define the correct order amount and initiate the money transfer.
If you use an AUTHORIZE transaction as the initial transaction, you need to follow up with a CAPTURE transaction, when you are ready to ship the goods and want the money to exchange hands.
If there is a delay in your ability to ship the goods, you may also need to use the UPDATE AUTHORIZATION transaction to keep the authorization active until you are ready to capture it.
If the order is cancelled for any reason, you need to use the VOID transaction to immediately cancel it with the gateway as well. If the payment details have already been sent to the bank, you need to use the REFUND transaction, which is also needed if the payer is not happy with their purchase and wants to return it.
The RETRIEVE TRANSACTION and RETRIEVE ORDER API operations can also be considered subsequent transactions, though they are used only to retrieve details of an existing order, and do not impact the order lifecycle. For a list of all available subsequent transactions, see Transactions.

Linking to initial transaction
All the transactions related to the same order must be linked so that the various payment systems (Mastercard Gateway and banks) can identify them as belonging together.
The linking is done by using the same order ID in every transaction related to the order. The order ID is provided as a path parameter in the request URL.

Shared data in subsequent transactions
Linking different transactions together within the same order means that you only need to provide specific data about the order once. The gateway stores the details for the order and can use them, as needed, when processing any subsequent transactions.
In any subsequent transaction, you only need to provide the data specific to that transaction. For example:

In a CAPTURE transaction, you need to provide the amount and currency for the goods you are shipping at that point (which may be the full or partial order amount).
In a REFUND transaction, you need to provide the amount and currency for the refund you are sending (which may be the full or partial order amount).
In a VOID transaction, you need to provide the transaction ID of the exact transaction you want to cancel.
In a REFERRAL transaction, you need to provide the authorization code that allows the issuer to approve the previously failed transaction.
If you provide identical information in multiple transactions within an order, the gateway ignores it. If you update any information in a subsequent transaction, the gateway updates the order details accordingly. For example, you have first provided a shipping address in the initial AUTHORIZE transaction, and the payer moves. You can then add a new shipping address to the CAPTURE transaction.


Interpreting the Response
Once the payer has completed their Hosted Payment Page interaction, you need to redirect them back to your web site, determine the payment result, and present them with a receipt.

Step 1: Redirect the payer to your website
Once the payer finishes their Hosted Payment Page interaction, they are returned to your web site. To accomplish this, you need to provide the URL to which they are redirected to in one of the following ways:
Provide the interaction.returnUrl field in the Initiate Checkout operation.
Define the complete callback for the Hosted Payment Page. For details, see Implementing Callbacks.

Step 2: Determine the payment result
The gateway sends the result of the payment in a resultIndicator field in one of two ways, depending on how the payer was redirected back to your site:
Appended to the URL (interaction.returnUrl) used for returning the payer to your web site.
Provided as an input parameter to the function provided in the complete callback or appended to the URL provided in the complete callback.
You can determine the success of the payment by comparing the resultIndicator parameter to the successIndicator parameter returned in the INITIATE CHECKOUT response. A match indicates that the payment is successful.


Do not use the value in the resultIndicator parameter as the receipt number.
Step 3: Display a payment receipt
If the operation was successful, display a payment receipt to the payer on your web site, and update your system with the payment details. You can retrieve the payment details in various ways:
With an API request - Use the Retrieve Order operation.
From Merchant Administration - The payment details are recorded in the Merchant Administration in the Order and Transaction Details page. You can search for the payment and perform subsequent operations.
Using Reporting - If your merchant profile has the Reporting feature enabled, you can download payment data in a formatted report from the gateway.
From email or Webhook notifications - If you subscribe to notifications in the Merchant Administration, you receive an email or Webhook notification for every successful payment.

Spend some time examining the transaction response fields for each relevant operation in the API Reference. All the fields provide valuable information, you can store some of them locally for accounting, reconciliation, and traceability reasons. The more complex your integration is, the more useful it can be to study specific response codes to identify all aspects of the transaction status.

It is good practice to validate whether the data you supplied for the transaction is the same as the data used to process the transaction. For example, check that the amount returned in the transaction response matches the value you sent in the request.


