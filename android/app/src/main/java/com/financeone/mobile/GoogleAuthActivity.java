package com.financeone.mobile;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentSender;
import android.os.Bundle;

public class GoogleAuthActivity extends Activity {
    private static final int REQUEST_AUTH = 4107;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (savedInstanceState != null) return;
        PendingIntent pendingIntent = getIntent().getParcelableExtra("pendingIntent");
        if (pendingIntent == null) {
            setResult(RESULT_CANCELED);
            finish();
            return;
        }
        try {
            startIntentSenderForResult(pendingIntent.getIntentSender(), REQUEST_AUTH, null, 0, 0, 0);
        } catch (IntentSender.SendIntentException error) {
            setResult(RESULT_CANCELED);
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_AUTH) {
            setResult(resultCode, data);
            finish();
        }
    }
}
