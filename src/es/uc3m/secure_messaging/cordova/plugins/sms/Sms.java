package es.uc3m.secure_messaging.cordova.plugins.sms;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsManager;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;

public class Sms extends CordovaPlugin {

	public final String ACTION_SEND_SMS = "send";

	public final String ACTION_HAS_PERMISSION = "has_permission";

	private static final String INTENT_FILTER_SMS_SENT = "SMS_SENT";

	private static final int SEND_SMS_REQ_CODE = 0;

	final String SENT_SMS_ACTION 			= 	"SENT_SMS_ACTION";
	final String DELIVERED_SMS_ACTION 		= 	"DELIVERED_SMS_ACTION";

	private CallbackContext callbackContext;

	private JSONArray args;

	@Override
	public boolean execute(String action, final JSONArray args, final CallbackContext callbackContext) throws JSONException {
		this.callbackContext = callbackContext;
		this.args = args;
		if (action.equals(ACTION_SEND_SMS)) {
			if (hasPermission()) {
				System.out.println ("Inicio Envío");
				sendSMS();
				System.out.println ("Fin Envío");
			} else {
				requestPermission();
			}
			return true;
		}
		else if (action.equals(ACTION_HAS_PERMISSION)) {
			callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, hasPermission()));
			return true;
		}
		return false;
	}

	private boolean hasPermission() {
		return cordova.hasPermission(android.Manifest.permission.SEND_SMS);
	}

	private void requestPermission() {
		cordova.requestPermission(this, SEND_SMS_REQ_CODE, android.Manifest.permission.SEND_SMS);
	}

	public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
		for (int r : grantResults) {
			if (r == PackageManager.PERMISSION_DENIED) {
				callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "User has denied permission"));
				return;
			}
		}
		sendSMS();
	}

	private boolean sendSMS() {
		cordova.getThreadPool().execute(new Runnable() {
			@Override
			public void run() {
				try {
					System.out.println ("Inicio sendSMS");
					//parsing arguments
					String separator = ";";
					if (Build.MANUFACTURER.equalsIgnoreCase("Samsung")) {
						// See http://stackoverflow.com/questions/18974898/send-sms-through-intent-to-multiple-phone-numbers/18975676#18975676
						separator = ",";
					}
					String phoneNumber = args.getJSONArray(0).join(separator).replace("\"", "");
					String message = args.getString(1);
					String method = args.getString(2);
					boolean replaceLineBreaks = Boolean.parseBoolean(args.getString(3));

					System.out.println ("Inicio replaceLines -- sendSMS");

					// replacing \n by new line if the parameter replaceLineBreaks is set to true
					if (replaceLineBreaks) {
						message = message.replace("\\n", System.getProperty("line.separator"));
					}

					System.out.println ("Inicio checkSupport -- sendSMS");
					/*if (!checkSupport()) {
						callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "SMS not supported on this platform"));
						return;
					}*/

					System.out.println ("Inicio INTENT -- sendSMS");
					if (method.equalsIgnoreCase("INTENT")) {
						System.out.println ("Hay INTENT");
						System.out.println (phoneNumber);
						System.out.println (message);
						invokeSMSIntent(phoneNumber, message);
						// always passes success back to the app
						callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
					} else {
						System.out.println ("Hay INTENT 2");
						System.out.println (phoneNumber);
						System.out.println (message);
						SmsManager smsManager = SmsManager.getDefault();
						/*if (message.length()<=160)
							smsManager.sendTextMessage(phoneNumber, null, message, null, null);
						else {
							ArrayList<String> parts = smsManager.divideMessage(message);
							smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
						}*/
						send(callbackContext, phoneNumber, message);
						callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
					}
					System.out.println ("Fin sendSMS");
					return;
				} catch (JSONException ex) {
					callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
				}
			}
		});
		return true;
	}

	private boolean checkSupport() {
		Activity ctx = this.cordova.getActivity();
		return ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
	}

	@SuppressLint("NewApi")
	private void invokeSMSIntent(String phoneNumber, String message) {
		Intent sendIntent;
		if ("".equals(phoneNumber) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
			String defaultSmsPackageName = Telephony.Sms.getDefaultSmsPackage(this.cordova.getActivity());

			sendIntent = new Intent(Intent.ACTION_SEND);
			sendIntent.setType("text/plain");
			sendIntent.putExtra(Intent.EXTRA_TEXT, message);

			if (defaultSmsPackageName != null) {
				sendIntent.setPackage(defaultSmsPackageName);
			}
		} else {
			sendIntent = new Intent(Intent.ACTION_VIEW);
			sendIntent.putExtra("sms_body", message);
			// See http://stackoverflow.com/questions/7242190/sending-sms-using-intent-does-not-add-recipients-on-some-devices
			sendIntent.putExtra("address", phoneNumber);
			sendIntent.setData(Uri.parse("smsto:" + Uri.encode(phoneNumber)));
		}
		this.cordova.getActivity().startActivity(sendIntent);
	}

	private void send(final CallbackContext callbackContext, String phoneNumber, String message) {
		SmsManager manager = SmsManager.getDefault();
		final ArrayList<String> parts = manager.divideMessage(message);

		// by creating this broadcast receiver we can check whether or not the SMS was sent
		final BroadcastReceiver broadcastReceiver = new BroadcastReceiver() {

			boolean anyError = false; //use to detect if one of the parts failed
			int partsCount = parts.size(); //number of parts to send

			@Override
			public void onReceive(Context context, Intent intent) {
				switch (getResultCode()) {
				case SmsManager.STATUS_ON_ICC_SENT:
				case Activity.RESULT_OK:
					break;
				case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
				case SmsManager.RESULT_ERROR_NO_SERVICE:
				case SmsManager.RESULT_ERROR_NULL_PDU:
				case SmsManager.RESULT_ERROR_RADIO_OFF:
					anyError = true;
					break;
				}
				// trigger the callback only when all the parts have been sent
				partsCount--;
				if (partsCount == 0) {
					if (anyError) {
						callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR));
					} else {
						callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
					}
					cordova.getActivity().unregisterReceiver(this);
				}
			}
		};

		// randomize the intent filter action to avoid using the same receiver
		String intentFilterAction = INTENT_FILTER_SMS_SENT + java.util.UUID.randomUUID().toString();
		this.cordova.getActivity().registerReceiver(broadcastReceiver, new IntentFilter(intentFilterAction));

		PendingIntent sentIntent = PendingIntent.getBroadcast(this.cordova.getActivity(), 0, new Intent(intentFilterAction), 0);

		// depending on the number of parts we send a text message or multi parts
		if (parts.size() > 1) {
			ArrayList<PendingIntent> sentIntents = new ArrayList<PendingIntent>();
			ArrayList<String> message_parts = manager.divideMessage(message);

			Intent iSent = new Intent(SENT_SMS_ACTION);
			PendingIntent piSent = PendingIntent.getBroadcast(this.cordova.getActivity(), 0, iSent, 0);
			Intent iDel = new Intent(DELIVERED_SMS_ACTION);
			PendingIntent piDel = PendingIntent.getBroadcast(this.cordova.getActivity(), 0, iDel, 0);

			int ct = message_parts.size();
			ArrayList<PendingIntent> sentPis = new ArrayList<PendingIntent>(ct);
			ArrayList<PendingIntent> delPis = new ArrayList<PendingIntent>(ct);

			for (int i = 0; i < ct; i++)
			{
				//sentPis.add(i, piSent);
				//delPis.add(i, piDel);
				sentPis.add(piSent);
				delPis.add(piDel);
			}

			manager.sendMultipartTextMessage(phoneNumber, null, message_parts, sentPis, delPis);

			//Toast.makeText(getApplicationContext(), " Message sent", Toast.LENGTH_SHORT).show();

			/*for (int i = 0; i < parts.size(); i++) {
				sentIntents.add(sentIntent);
			}
			manager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null);*/
		}
		else {
			manager.sendTextMessage(phoneNumber, null, message, sentIntent, null);
		}
	}
}
