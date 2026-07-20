package com.financeone.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(FinanceOneGooglePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
