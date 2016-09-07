/*********************************************************************/
/*** JAVASCRIPT TO MANAGE THE 'MY DATA' WITH MY PERMANENT RSA KEYS ***/
/*********************************************************************/

// variables to store the private and public RSA Keys
var privateKey = null;
var publicKey = null;

// variable to access to the SQLite database
var myDB = null;

// variable to store the bit length of the RSA key pair
var keyBitLength = 512;


// Function to create table to store my personal data: the private key (privateKeyRSA) and the public key (publicKeyRSA) if they do not exist
function createTableMyData(callback){
   myDB = window.sqlitePlugin.openDatabase({name: "mySecureMessaging.db", location: 'default',androidDatabaseImplementation: 2});
   myDB.transaction(function(transaction) {
       transaction.executeSql('CREATE TABLE IF NOT EXISTS myData (key text primary key, value text)', [],
       function(tx, result) {
          console.log( "Table 'myData' open/created successfully." );
          callback();
       },
       function(error) {
           alert("Error occurred while creating the table 'myData'.");
       });
   });
}

// Function to delete the table to store my personal data
function deleteTableMyData(callback){
   if (myDB==null) {
        myDB = window.sqlitePlugin.openDatabase({name: "mySecureMessaging.db", location: 'default'});
   }
   myDB.transaction(function(transaction) {
       transaction.executeSql('DROP TABLE myData', [],
       function(tx, result) {
           console.log( "Table 'myData' deleted successfully." );
           callback();
       },
       function(error) {
           alert("Error occurred while deleting the table 'myData'.");
       });
   });
}

// Function to generate a new RSA key pair and store them in memory
function writeRSAkeysMemory(){
     var rsa = forge.pki.rsa;
     var keypair = rsa.generateKeyPair({bits: keyBitLength, e: 0x10001});
     privateKey = keypair.privateKey;
     publicKey = keypair.publicKey;
}

// Function to store the values of my information data in database (mainly it will be the values of a new RSA key pair)
function writeRSAkeyDataBase(db,table,key,value){
    db.executeSql('INSERT INTO '+table+'(key, value) VALUES (?,?)', [key,value], function (resultSet) {
      console.log('Key '+key+' was inserted in DataBase');
    }, function(error) {
      console.log('Error in INSERT: ' + error.message);
    });
}

// Function to update the values (n,e,d,q,p,do,dq,qinv) of a new RSA key pair previously generated in database
function updateRSAkeyDataBase(db,table,key,value){
    db.executeSql('UPDATE '+table+' SET value=? WHERE key=?', [value,key], function (resultSet) {
      console.log('Key '+key+' was updated successfully in DataBase');
    }, function(error) {
      console.log('Error in update RSA key: ' + error.message);
    });
}

// Function to insert the values (n,e,d,q,p,do,dq,qinv) of a new RSA key pair previously generated in database
function writeRSAkeysDataBase(callback){
    n = privateKey.n.toString();
    e = privateKey.e.toString();
    d = privateKey.d.toString();
    p = privateKey.p.toString();
    q = privateKey.q.toString();
    dp = privateKey.dP.toString();
    dq = privateKey.dQ.toString();
    qinv = privateKey.qInv.toString();

    myDB.transaction(function(transaction) {
        writeRSAkeyDataBase(myDB,"myData","n",n);
        writeRSAkeyDataBase(myDB,"myData","e",e);
        writeRSAkeyDataBase(myDB,"myData","d",d);
        writeRSAkeyDataBase(myDB,"myData","p",p);
        writeRSAkeyDataBase(myDB,"myData","q",q);
        writeRSAkeyDataBase(myDB,"myData","dP",dp);
        writeRSAkeyDataBase(myDB,"myData","dQ",dq);
        writeRSAkeyDataBase(myDB,"myData","qInv",qinv);
        callback();
    });
}

// Function to update the values (n,e,d,q,p,do,dq,qinv) of a new RSA key pair previously generated in database
function updateRSAkeysDataBase(callback){
    n = privateKey.n.toString();
    e = privateKey.e.toString();
    d = privateKey.d.toString();
    p = privateKey.p.toString();
    q = privateKey.q.toString();
    dp = privateKey.dP.toString();
    dq = privateKey.dQ.toString();
    qinv = privateKey.qInv.toString();

    myDB.transaction(function(transaction) {
        updateRSAkeyDataBase(myDB,"myData","n",Kn);
        updateRSAkeyDataBase(myDB,"myData","e",Ke);
        updateRSAkeyDataBase(myDB,"myData","d",Kd);
        updateRSAkeyDataBase(myDB,"myData","p",Kp);
        updateRSAkeyDataBase(myDB,"myData","q",Kq);
        updateRSAkeyDataBase(myDB,"myData","dP",Kdp);
        updateRSAkeyDataBase(myDB,"myData","dQ",Kdq);
        updateRSAkeyDataBase(myDB,"myData","qInv",Kqinv);
        callback();
    });
}

// Function to read My Data (RSA public key and RSA private Key) from Database.
//      If the table is empty in database, a new RSA key pair are generated and stored in database.
function readMyData(){
    if (privateKey==null && publicKey==null){
        myDB.executeSql("SELECT key,value FROM myData", [], function(resultSet) {
            var i=0;
            if (resultSet.rows.length==0){
                writeRSAkeysMemory();
                writeRSAkeysDataBase();
            } else {
                for (i = 0; i < resultSet.rows.length; i++) {
                    if (resultSet.rows.item(i).key=="n"){
                        n = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="e"){
                        e = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="d"){
                        d = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="p"){
                        p = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="q"){
                        q = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="dP"){
                        dp = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="dQ"){
                        dq = resultSet.rows.item(i).value;
                    }
                    if (resultSet.rows.item(i).key=="qInv"){
                        qinv = resultSet.rows.item(i).value;
                    }
                }
                var rsa = forge.pki.rsa;

                var BIn = new forge.jsbn.BigInteger(bigInt(n).toString());
                var BIe = new forge.jsbn.BigInteger(bigInt(e).toString());
                var BId = new forge.jsbn.BigInteger(bigInt(d).toString());
                var BIp = new forge.jsbn.BigInteger(bigInt(p).toString());
                var BIq = new forge.jsbn.BigInteger(bigInt(q).toString());
                var BIdp = new forge.jsbn.BigInteger(bigInt(dp).toString());
                var BIdq = new forge.jsbn.BigInteger(bigInt(dq).toString());
                var BIqinv = new forge.jsbn.BigInteger(bigInt(qinv).toString());

                publicKey = rsa.setPublicKey(BIn, BIe);
                privateKey = rsa.setPrivateKey(BIn, BIe, BId, BIp, BIq, BIdp, BIdq, BIqinv);
            }
        });
    }
}

// Set the length of the RSA key pair to the value desired by the user
function setNewRSABitLength(length){
    keyBitLength = length;
}

// Return the private Key object
function getRSAPrivateKey(){
    return privateKey;
}

// Return the public Key object
function getRSAPublicKey(){
    return publicKey;
}

// Return the value n from public key to Base35
function getNRSABase35(){
    var regex = 35;
    return publicKey.n.toString(regex);
}

// Return the value e from public key to Base35
function getERSABase35(){
    var regex = 35;
    return publicKey.e.toString(regex);
}

// Function to write on the screen my information data (with the values of my RSA public Key and My RSA private Key)
function loadRSAKeysView(){
    var divRoot = document.getElementById("main");
    while (divRoot.firstChild) {
      divRoot.removeChild(divRoot.firstChild);
    }

    var divP = document.createElement("div");
    divP.setAttribute("data-role", "collapsible");
    var h3P = document.createElement("h3");
    h3P.appendChild(document.createTextNode("Public RSA Key"));
    var labelPn = document.createElement("label");
    labelPn.setAttribute("for", "basic");
    labelPn.appendChild(document.createTextNode("n:"));
    var textareaPn = document.createElement("textarea");
    textareaPn.setAttribute("readonly", "true");
    textareaPn.setAttribute("cols", "40");
    textareaPn.setAttribute("rows", "8");
    textareaPn.setAttribute("name", "textarea");
    textareaPn.setAttribute("id", "Pn");
    textareaPn.appendChild(document.createTextNode(publicKey.n.toString()));
    var labelPe = document.createElement("label");
    labelPe.setAttribute("for", "basic");
    labelPe.appendChild(document.createTextNode("e:"));
    var textareaPe = document.createElement("textarea");
    textareaPe.setAttribute("readonly", "true");
    textareaPe.setAttribute("cols", "40");
    textareaPe.setAttribute("rows", "1");
    textareaPe.setAttribute("name", "textarea");
    textareaPe.setAttribute("id", "Pe");
    textareaPe.appendChild(document.createTextNode(publicKey.e.toString()));
    divP.appendChild(h3P);
    divP.appendChild(labelPn);
    divP.appendChild(textareaPn);
    divP.appendChild(labelPe);
    divP.appendChild(textareaPe);
    divRoot.appendChild(divP);

    var divK = document.createElement("div");
    divK.setAttribute("data-role", "collapsible");
    var h3K = document.createElement("h3");
    h3K.appendChild(document.createTextNode("Private RSA Key"));
    var labelKn = document.createElement("label");
    labelKn.setAttribute("for", "basic");
    labelKn.appendChild(document.createTextNode("n:"));
    var textareaKn = document.createElement("textarea");
    textareaKn.setAttribute("readonly", "true");
    textareaKn.setAttribute("cols", "40");
    textareaKn.setAttribute("rows", "8");
    textareaKn.setAttribute("name", "textarea");
    textareaKn.setAttribute("id", "Kn");
    textareaKn.appendChild(document.createTextNode(privateKey.n.toString()));
    var labelKd = document.createElement("label");
    labelKd.setAttribute("for", "basic");
    labelKd.appendChild(document.createTextNode("d:"));
    var textareaKd = document.createElement("textarea");
    textareaKd.setAttribute("readonly", "true");
    textareaKd.setAttribute("cols", "40");
    textareaKd.setAttribute("rows", "8");
    textareaKd.setAttribute("name", "textarea");
    textareaKd.setAttribute("id", "Kd");
    textareaKd.appendChild(document.createTextNode(privateKey.d.toString()));
    divK.appendChild(h3K);
    divK.appendChild(labelKn);
    divK.appendChild(textareaKn);
    divK.appendChild(labelKd);
    divK.appendChild(textareaKd);
    divRoot.appendChild(divK);

    var p = document.createElement("p");
    p.setAttribute("style", "text-align:center;");
    p.appendChild(document.createTextNode("The length of the keys is "+keyBitLength+" bits right now"));
    divRoot.appendChild(p);

    $('#main').trigger('create');
}