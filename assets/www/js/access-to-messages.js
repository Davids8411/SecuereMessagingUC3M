/*****************************************/
/*** JAVASCRIPT TO MANAGE THE MESSAGES ***/
/*****************************************/

// variable to access to the SQLite database
var myDB = null;

// variable to store the list of phones with, at least, a message sent or received
var listPhones = [];

// variable to store a list of conversations with the following properties:
//      - The phone number with, at least, a message sent or received
//      - The total number of messages associated to the previous number
//      - The date of the last message sent or received associated to the previous number
//      - If the last message was sent or received by the phone number
var listView = [];

// variable to store a list of messages with the following properties:
//      - The ID of the message
//      - The phone number associated to the message
//      - The message sent or received
//      - The date when the message was sent or received
//      - If the message was sent or received
var listMessages = [];

// Function to get the actual hour
function getLocaleTime(){
    var options = { weekday: 'long', year: 'numeric', month: 'numeric' ,day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date().toLocaleString('en-GB',options);
}

// Function to get the actual hour
function getStringLocaleTime(date){
    var options = { weekday: 'long', year: 'numeric', month: 'numeric' ,day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleString('en-GB',options);
}

// Function to load the list of conversations from the list of messages
function loadListView(){
    listView.splice(0,listView.length);
    listPhones.splice(0,listPhones.length);
    var i = 0;
    for(i=0;i<listMessages.length;i++){
         var index = listPhones.indexOf(listMessages[i].phone);
         if (index<0){
            listPhones.push(listMessages[i].phone);

            var messageList = new Object();
            messageList.phone = listMessages[i].phone;
            messageList.time = getLocaleTime(listMessages[i].time);
            messageList.isSent = listMessages[i].isSent;
            messageList.NumberMessages = 1;

            listView.push(messageList);
         } else {
            listView[index].NumberMessages = listView[index].NumberMessages+1;
         }
    }
}

// Function to print the list of conversations on the screen
function printListviewPhonesWithMessages() {
    var ul = document.getElementById("message-list");
    while (ul.firstChild) {
      ul.removeChild(ul.firstChild);
    }

    var i=0;
    for(i=0;i<listView.length;i++){
        var li = document.createElement("li");
        var a = document.createElement("a");
        var img = document.createElement("img");
        var h2 = document.createElement("h2");
        var p1 = document.createElement("p");
        var p2 = document.createElement("p");
        a.setAttribute("href", "messages.html");
        a.setAttribute("onclick", "app.LoadMessages("+listView[i].phone+")");
        img.setAttribute("src", "img/icons-png/contact.png");
        img.setAttribute("class", "ui-li-thumb");
        p2.setAttribute("class", "ui-li-aside");
        h2.appendChild(document.createTextNode(listView[i].phone));

        if (listView[i].isSent==0)
            p1.appendChild(document.createTextNode("Date last Received: "+listView[i].time));
        else {
            p1.appendChild(document.createTextNode("Date last Sent: "+listView[i].time));
        }
        p2.appendChild(document.createTextNode("Messages: "+listView[i].NumberMessages));

        a.appendChild(img);
        a.appendChild(h2);
        a.appendChild(p1);
        a.appendChild(p2);
        li.appendChild(a);
        ul.appendChild(li);
        $("ul").listview("refresh");
    }
}

// Function to print the list of messages from a contact (phone number) on the screen
function printListviewMessages(phone) {
    var divRoot = document.getElementById("main");
    while (divRoot.firstChild) {
      divRoot.removeChild(divRoot.firstChild);
    }

    if (phone.toString().indexOf("+") == -1){
        phone = "+" + phone;
    }
    var h1 = document.getElementById("phone");
    h1.innerHTML=phone;

    var i=0;
    for(i=0;i<listMessages.length;i++){
        if (listMessages[i].phone==phone) {
            var divFather = document.createElement("div");
            var h3 = document.createElement("h3");
            var p = document.createElement("p");
            var divSon = document.createElement("div");
            var input = document.createElement("input");
            divFather.setAttribute("data-role", "collapsible");

            var timeMsg = timeMsg = listMessages[i].time;

            if (listMessages[i].isSent==0){
                h3.appendChild(document.createTextNode("<-- Received, Date: "+timeMsg));
            }
            else {
                h3.appendChild(document.createTextNode("--> Sent, Date: "+timeMsg));
            }

            p.appendChild(document.createTextNode(listMessages[i].message));
            divSon.setAttribute("style", "text-align:center;");
            input.setAttribute("type", "button");
            input.setAttribute("onclick", "app.deleteMessage("+listMessages[i].id+","+listMessages[i].phone+")");
            input.setAttribute("value", "Delete Message");
            input.setAttribute("data-icon", "delete");
            input.setAttribute("data-iconpos", "right");
            input.setAttribute("data-inline", "true");

            divSon.appendChild(input);
            divFather.appendChild(h3);
            divFather.appendChild(p);
            divFather.appendChild(divSon);
            divRoot.appendChild(divFather);
        }
    }
    $('#main').trigger('create');
}

// Function to create the messages table if not exist
function createTableMessages(callback){
   myDB = window.sqlitePlugin.openDatabase({name: "mySecureMessaging.db", location: 'default',androidDatabaseImplementation: 2});
   myDB.transaction(function(transaction) {
       transaction.executeSql('CREATE TABLE IF NOT EXISTS messages (id integer primary key, phone text, message text, time datetime, isSent boolean)', [],
       function(tx, result) {
           console.log( "Table messages open/created successfully." );
           callback();
       },
       function(error) {
           alert("Error occurred while creating the table.");
       });
   });
}

// Function to delete the messages table
function deleteTableMessages(callback){
   if (myDB==null) {
        myDB = window.sqlitePlugin.openDatabase({name: "mySecureMessaging.db", location: 'default'});
   }
   myDB.transaction(function(transaction) {
       transaction.executeSql('DROP TABLE messages', [],
       function(tx, result) {
           console.log( "Table messages deleted successfully." );
           callback();
       },
       function(error) {
           alert("Error occurred while creating the table.");
       });
   });
}

// Function to write a message into the database in table 'messages'
function writeMessageDataBase(phone,msg,timeMsgReceived,isSent,callback){
    myDB.transaction(function(transaction) {
        myDB.executeSql('INSERT INTO messages(phone, message, time, isSent) VALUES (?,?,?,?)', [phone,msg,timeMsgReceived,isSent], function (resultSet) {
            console.log('resultSet.insertId: ' + resultSet.insertId);
            callback(resultSet.insertId);
        }, function(error) {
            console.log('Error in INSERT: ' + error.message);
        });
    });
}

// Function to delete a message from database
function deleteMessageDataBase(id,callback){
     myDB.transaction(function(transaction) {
         myDB.executeSql('DELETE FROM messages WHERE id=?', [id], function (resultSet) {
           console.log("Table 'messages' - ID removed: " + resultSet.insertId);
           callback();
         }, function(error) {
           console.log("Error in DELETE from table 'messages': " + error.message);
         });
     });
}

// Function to write a message in Memory in the objects:
//      - 'listView' with the list of conversations
//      - 'listPhones' with the list of phones with, al least, a message
//      - 'listMessages' with the list of messages
function writeMessageMemory(phone,msg,timeMsgReceived,isSent,id){
    // Write the message in the list of conversations and in the list of phone numbers
    var numMsg = 1;
    var index = listPhones.indexOf(phone);
    if (index >= 0){
        numMsg = listView[index].NumberMessages + 1;
        var len = listPhones.length;
        listView.splice(index,1);
        listPhones.splice(index,1);
    }

    var messageList = new Object();
    messageList.phone = phone;
    messageList.time = getLocaleTime(timeMsgReceived);
    messageList.isSent = isSent;
    messageList.NumberMessages = numMsg;

    listView.unshift(messageList);
    listPhones.unshift(phone);

    // Write the message in the list of messages
    var message = new Object();
    message.id = id;
    message.phone = phone;
    message.message = msg;
    message.time = timeMsgReceived;
    message.isSent = isSent;
    listMessages.unshift(message);
}

// Function to delete a message from memory. The message will be delete from 'listMessages' with the list of messages
//      and the objects 'listView' and 'listPhones' will be regenerated.
function deleteMessageMemory(id){
     var i=0;
     while ((listMessages[i].id!=id) || (i>=listMessages.length)){
        i=i+1;
     }
     if (listMessages[i].id==id){
        var phone=listMessages[i].phone;
        listMessages.splice(i,1);
        loadListView();
     }
}

// Function to read messages from database to memory. The message will be added to 'listMessages' with the list of messages
//      and the objects 'listView' and 'listPhones' will be regenerated.
function readMessages(callback){
     myDB.executeSql("SELECT id,phone,message,time,isSent FROM messages order by id desc", [], function(resultSet) {
       console.log('Length: ' + resultSet.rows.length);
       var i=0;
       for (i = 0; i < resultSet.rows.length; i++) {
           var message = new Object();
           message.id = resultSet.rows.item(i).id;
           message.phone = resultSet.rows.item(i).phone;
           message.message = resultSet.rows.item(i).message;
           message.time = resultSet.rows.item(i).time;
           message.isSent = resultSet.rows.item(i).isSent;
           listMessages.push(message);
       }

       // load conversations list from messages list
       loadListView();

       callback();
     });
}

// Function to close database
function closeDataBase(){
   myDB.transaction(function(transaction) {
       myDB.close();
   });
}

// Function to get the 'listMessages' with the list of messages
function getCompleteListMessages(){
    return listMessages;
}

// Function to get the 'listView' with the list of conversations
function getCustomListMessages(){
    return listView;
}

// Function to delete all messages from database
function deleteAllMessages(callback){
    listMessages.splice(0,listMessages.length);
    myDB.transaction(function(transaction) {
        myDB.executeSql('DELETE FROM messages', [], function (resultSet) {
            console.log("All messages from database have been removed.");
            callback();
        }, function(error) {
            console.log('Error in DELETE all messages: ' + error.message);
        });
    });
}
