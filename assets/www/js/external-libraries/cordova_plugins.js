cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins-sms/sms.js",
        "id": "es.uc3m.secure_messaging.cordova.plugins.sms.Sms",
        "clobbers": [
            "window.sms"
        ]
    },
    {
        "file": "plugins-sqlite/SQLitePlugin.js",
        "id": "cordova-sqlite-storage.SQLitePlugin",
        "clobbers": [
            "SQLitePlugin"
        ]
    }
];
module.exports.metadata =
// TOP OF METADATA
{
    "cordova-plugin-whitelist": "1.2.2",
    "es.uc3m.secure_messaging.cordova.plugins": "0.1.10"
};
// BOTTOM OF METADATA
});