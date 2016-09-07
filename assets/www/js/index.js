/*****************************************************/
/*** MAIN JAVASCRIPT WITH ALL MAIN FUNCTION NEEDED ***/
/*****************************************************/

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');

        /* Read my Data with RSA Keys from DataBase to Memory */
        createTableMyData(function(){
            readMyData();
        });

        /* Read Contacts Keys (RSA, Curve 25519) from DataBase to Memory */
        createTablesContact(function(){
            readContacts();
        });

        /* Read messages from DataBase to Memory */
        createTableMessages(function(){
            readMessages(function(){
                printListviewPhonesWithMessages();
            });
        });

        /* Waiting to recieve a new message using the cordova plugin 'smsinboxplugin' */
        var smsInboxPlugin = cordova.require('cordova/plugin/smsinboxplugin');
        smsInboxPlugin.startReception (function(msg) {
            var message = msg[3];
            var phone = msg[1];
            try {
                    /* The message is obtained from the text received */
                    getPlainTextFromSignAndCipherText(phone,message,function(data){
                    if (data.error == 0){ // The message received is a message created, ciphered and signed by the mobile app sender
                        alert("RECEIVED RAW SMS\n\n"+message);
                        /* If the plain text was signed correctly and could be deciphered, the plain text is stored in memory and database*/
                        var timeMsgReceived = new Date();
                        // Write the message in Database and Memory
                        writeMessageDataBase(phone,data.plainText,timeMsgReceived,0, function(id) {
                            writeMessageMemory(phone,data.plainText,timeMsgReceived,0,id);
                            printListviewPhonesWithMessages();
                        });
                    } else if (data.error == 1 || data.error == 2){ // The message received are public keys (permanent and ephemeral)
                        alert("RECEIVED RAW SMS\n\n"+message);
                        var nRSAIndex = message.indexOf(",");
                        var eRSAIndex = message.indexOf(",",nRSAIndex+1);
                        if (nRSAIndex > 0 && eRSAIndex > 0){
                            var regex = 35;
                            var nRSA35 = message.substring(1,nRSAIndex);
                            var eRSA35 = message.substring(nRSAIndex+1,eRSAIndex);
                            var publicEphemeralKey = message.substring(eRSAIndex+1,message.length);

                            var nRSA = bigInt(nRSA35,regex).toString();
                            var eRSA = bigInt(eRSA35,regex).toString();

                            if (existPhone(phone)){ // If the keys are from a contact that was already stored in our system
                                var answer = confirm("You have received the keys from the contact "+phone+", but the contact already exist in the database. Would you like to update the keys for this contact? If you say yes, you can check within 'contacts' that the keys accepted are the same your contact has.");
                                if (answer){
                                    updateContact(phone,nRSA,eRSA,publicEphemeralKey,function(){
                                        alert("Contact "+phone+" updated successfully.");
                                    });
                                }
                            } else { // If the keys are from a contact that was not stored in our system yet
                                var answer = confirm("You have received the keys from the contact "+phone+". Would you like to accept the keys and insert them in the database? You can check within 'contacts' that the keys accepted are the same your contact has.");
                                if (answer){
                                    writeContactDataBase(phone,nRSA,eRSA,publicEphemeralKey,function(){
                                        writeContactMemory(phone,nRSA,eRSA,publicEphemeralKey);
                                        alert("Contact added successfully.");
                                    });
                                }
                            }

                            /* If the sender wants to indicate that they need the public keys (permanent and ephemeral) from the receiver */
                            if (data.error == 1){
                                var answer2 = confirm("The contact "+phone+" is asking your public keys. Would you like to send them to the contact?");
                                if (answer2){

                                    /* Options used to send the message with the keys */
                                    var options = {
                                        replaceLineBreaks: false, // true to replace \n by a new line, false by default
                                        android: {
                                            intent: 'NO_INTENT'  // send SMS with the native android SMS messaging
                                        }
                                    };
                                    var success = function () { alert('Keys generated and sent successfully'); };
                                    var error = function (e) { alert('Error sending keys: ' + e); };

                                    var ephemeralKeys = getLastEphemeralKeysContact(phone);
                                    if (ephemeralKeys.publicKey == ""){ // if the user do not have ephemeral keys generated for that contact
                                        // Generate a new key pair curve 25519
                                        var curve25519Keys = generateKeyPairCurve25519();

                                        writeContactEphemeralKeysDataBase(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, function(id){
                                            writeNewContactEphemeralKeysMemory(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, id);
                                            var text = getTextForSendingAndObtainingKeys(curve25519Keys.publicKey,false);
                                            alert("RAW SMS TO BE SENT\n\n"+text);

                                            // The keys are sent to the receiver
                                            sms.send(phone, text, options, success, error);
                                        });
                                    } else { // if the user do have ephemeral keys generated for that contact, they send the last key public ephemeral key generated and the permanent RSA public key
                                        var text = getTextForSendingAndObtainingKeys(ephemeralKeys.publicKey,false);
                                        alert("RAW SMS TO BE SENT\n\n"+text);

                                        // The keys are sent to the receiver
                                        sms.send(phone, text, options, success, error);
                                    }
                                }
                            }
                        }
                    } else {
                        alert("An message has been received, but deciphering has been impossible.");
                    }
                });
            }
            catch (err){
                alert("An message has been received, but deciphering has been impossible: "+err);
            }
        }, function() {
          alert("Error while receiving messages");
        });
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
    // Send a message to the contact cipher (with shared key) and signed (with the private RSA key)
    sendSms: function() {
        // The phone number and message (plain text) are read
        var number = document.getElementById('numberTxt').value;
        var message = document.getElementById('messageTxt').value;
        console.log("number=" + number + ", message= " + message);

        // Only if the phone exists as a contact, the message will able to be sent
        var exist = existPhone(number);
        if (exist) {
            // The message (plain text) is cipher (with shared key) and signed (with the private RSA key)
            createTextCipheredAndSign(number,message,function(data){

                if (data.error == 0){
                        /* Options used to send the message */
                        var options = {
                            replaceLineBreaks: false, // true to replace \n by a new line, false by default
                            android: {
                                intent: 'NO_INTENT'  // send SMS with the native android SMS messaging
                            }
                        };
                        var success = function () { alert('Message sent successfully'); };
                        var error = function (e) { alert('Message Failed:' + e); };
                        var textBase64 = data.cipherTextWithPublicKeysAndSignature;

                        alert("RAW SMS TO BE SENT\n\n"+textBase64);
                        // The cipher and sign text is sent encoded in base64 format
                        sms.send(number, textBase64, options, success, error);

                        // The message (in plain text) is stored in memory and database
                        var timeMsgSent = new Date();
                        writeMessageDataBase(number,message,timeMsgSent,1, function(id) {
                            writeMessageMemory(number,message,timeMsgSent,1,id);
                            printListviewPhonesWithMessages();
                            document.getElementById("form_new_sms").reset();
                        });
                    }
                    else {
                        alert("An error has occurred and message will not be sent. Please, check RSA and Curve 25519 keys, and try it again.");
                    }

            });
        }
        else {
            alert("The phone number do not exist within contact table. Please, create the contact in the DataBase clicking in 'Add Contact'.");
        }
    },
    // Delete a message from memory and database
    deleteMessage: function(id,phone) {
        deleteMessageDataBase(id,function(){
            deleteMessageMemory(id);
            printListviewMessages(phone);
        });
    },
    // Load the list of phones, the number of messages associates to each phone,
    //    if the las message was sent o received and its shipping date or reception date
    loadView: function(){
        loadListView();
        printListviewPhonesWithMessages();
    },
    // Load the list of messages associates to a phone
    LoadMessages: function(phone) {
        $('body').off("pagecreate", '#messages-page').on('pagecreate', '#messages-page', function() {
               printListviewMessages(phone);
        });
    },
    // Load the view with RSA keys (public and private)
    loadRSAKeys: function() {
        $('body').off("pagecreate", '#myKeys-page').on("pagecreate", '#myKeys-page', function(event) {
            loadRSAKeysView();
        });
    },
    // Create a new contact with its necessary keys
    addContact: function() {
        phone = $('#tel-add-contact').val();

        phoneIsCorrect = isCorrectPhone(phone)

        if (phoneIsCorrect == 0) {
            alert("The phone number do not have a correct format: +34666555444 (example)");
        }
        else if (existPhone(phone) == 0){
            // Generate a new key pair curve 25519
            var curve25519Keys = generateKeyPairCurve25519();

            if ($('#checkbox-enhanced').is(':checked')) {
                // Ephemeral keys previously generated are stored in memory and database
                writeContactEphemeralKeysDataBase(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, function(id){
                    writeNewContactEphemeralKeysMemory(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, id);
                    var text = getTextForSendingAndObtainingKeys(curve25519Keys.publicKey,true);
                    alert("RAW SMS TO BE SENT\n\n"+text);
                    //send the keys to the contact
                    var options = {
                        replaceLineBreaks: false, // true to replace \n by a new line, false by default
                        android: {
                            intent: 'NO_INTENT'  // send SMS with the native android SMS messaging
                        }
                    };
                    var success = function () {
                        alert('Keys generated and sent successfully. The contact will not be added until not receiving the contact public keys');
                        document.getElementById("form_add_contact").reset();
                    };
                    var error = function (e) { alert('Error sending keys: ' + e); };

                    // The keys are sent
                    sms.send(phone, text, options, success, error);
                });
            } else {
                // the RSA Public key (n,e) and Secret Key are obtained
                Pn = $('#Pn-add-contact').val();
                Pe = $('#Pe-add-contact').val();
                CPKC25519 = $('#CPKC25519-add-contact').val();

                // If there is no error in the keys, they are stored in memory and database
                var result = checkInputKeysWellFormed(phone,Pn,Pe,curve25519Keys.publicKey,curve25519Keys.secretKey,CPKC25519);
                if (result.error == 0){
                    writeContactDataBase(phone,Pn,Pe,CPKC25519,function(){
                        writeContactMemory(phone,Pn,Pe,CPKC25519);

                        writeContactEphemeralKeysDataBase(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, function(id){
                            writeNewContactEphemeralKeysMemory(phone, curve25519Keys.secretKey, curve25519Keys.publicKey, id);
                            alert("Contact added");
                            document.getElementById("form_add_contact").reset();
                        });
                    });
                }
                else {
                    alert(result.message);
                }
            }
        }
        else {
            alert("This contact was added previously, try to modify it in the previous view");
        }
    },
    // Load contact view with all contacts and the keys associated with them
    loadContacts: function() {
        $('body').off("pagecreate", '#myContacts-page').on('pagecreate', '#myContacts-page', function() {
            loadViewContacts();
        });
    },
    // The contact with the keys associated with them is deleted from memory and database
    deleteContact: function(phone) {
        if (phone.toString().indexOf("+") == -1){
            phone = "+" + phone;
        }
        deleteContactDataBase(phone,function(){
            deleteContactMemory(phone);
            loadViewContacts();
            alert("Contact "+phone+" deleted");
        });
    },
    // The changes in a contact (public RSA key (n,e), my ephemeral key pair for this contact,
    //    the public ephemeral key of the contact are stored in memory and database
    saveChangesContact: function(phone){
        if (phone.toString().indexOf("+") == -1){
            phone = "+" + phone;
        }
        var nRSA = document.getElementById("Pn-"+phone).value;
        var eRSA = document.getElementById("Pe-"+phone).value;
        var myPublicEphemeralKey = document.getElementById("myPublicEphemeralKey-"+phone).value;
        var mySecretEphemeralKey = document.getElementById("mySecretEphemeralKey-"+phone).value;
        var contactPublicEphemeralKey = document.getElementById("contactPublicEphemeralKey-"+phone).value;

        var result = checkInputKeysWellFormed(phone,nRSA,eRSA,myPublicEphemeralKey,mySecretEphemeralKey,contactPublicEphemeralKey);
        if (result.error == 0){
            updateKeys(phone,nRSA,eRSA,myPublicEphemeralKey,mySecretEphemeralKey,contactPublicEphemeralKey,function(){
                loadViewContacts();
            });
        }
        else {
            alert(result.message);
        }
    },
    // Show the object with my RSA key pair (public and private key)
    showObjectRSA: function(){
        var publicRSAKey = getRSAPublicKey();
        var JSONPublicRSAKey = JSON.stringify(publicRSAKey, null, '\t');
        alert("RSA Public Key:\n\n"+JSONPublicRSAKey);
        var privateRSAKey = getRSAPrivateKey();
        var JSONPrivateRSAKey = JSON.stringify(privateRSAKey, null, '\t');
        alert("RSA Private Key:\n\n"+JSONPrivateRSAKey);
    },
    // Show the objects (Contact Data: RSA Public key (n,e) and last public ephemeral key sent for each contact, and
    //    Contact ephemeral keys: my ephemeral curve 25519 keys for each contact)
    showObjectsContact: function(){
        var contactsData = getContacts();
        var JSONListContactsData = JSON.stringify(contactsData, null, '\t');
        alert("Contact Data:\n\n"+JSONListContactsData);

        var listMyEphemeralKeyContacts = getEphemeralKeysContacts();
        var JSONListMyEphemeralKeyContacts = JSON.stringify(listMyEphemeralKeyContacts, null, '\t');
        alert("Ephemeral keys for every contact:\n\n"+JSONListMyEphemeralKeyContacts);
    },
    // Show the object with all messages and the object with the number of messages per phone
    showObjectsMessages: function(){
        var allMessages = getCompleteListMessages();
        var JSONAllMessages = JSON.stringify(allMessages, null, '\t');
        alert("All Messages:\n\n"+JSONAllMessages);

        var numberMessagesByPhone = getCustomListMessages();
        var JSONNumberMessagesByPhone = JSON.stringify(numberMessagesByPhone, null, '\t');
        alert("Messages by phone:\n\n"+JSONNumberMessagesByPhone);
    },
    // Delete all contact from memory and database
    deleteAllContact: function(){
        var answer = confirm("Are you sure that you want to delete all contacts from memory and database?")
        if (answer){
               deleteAllContacts(function(){
                    alert("The operation has been completed.");
               });
        }
    },
    // Delete all messages from memory and database
    deleteAllMessages: function(){
        var answer = confirm("Are you sure that you want to delete all messages from memory and database?")
        if (answer){
               deleteAllMessages(function(){
                    alert("The operation has been completed.");
               });
        }
    },
    // Regenerate RSA keys (public key and private key)
    regenerateRSA: function(){
        var RSABitsLengthSelected = $('input[name=radio-choice]:checked', '#setup-form-length-RSA').val();
        var answer = confirm("Are you sure that you want to regenerate your RSA Keys? Remember that your new RSA public key must be shared with all your contacts.")
        if (answer){
               setNewRSABitLength(RSABitsLengthSelected);
               writeRSAkeysMemory();
               updateRSAkeysDataBase(function(){
                    alert("The operation has been completed.");
               });
        }
    },
    // Enable o disable fields depending on the user wants to add a contact manually or automatically.
    addAutomaticContact: function(){
        if ($('#checkbox-enhanced').is(':checked')) {
            $('#Pn-add-contact').val("");
            $('#Pe-add-contact').val("");
            $('#CPKC25519-add-contact').val("");
            $('#Pn-add-contact').prop('disabled',true);
            $('#Pe-add-contact').prop('disabled',true);
            $('#CPKC25519-add-contact').prop('disabled',true);
        } else {
            $('#Pn-add-contact').prop('disabled',false);
            $('#Pe-add-contact').prop('disabled',false);
            $('#CPKC25519-add-contact').prop('disabled',false);
        }
    }
};

app.initialize();