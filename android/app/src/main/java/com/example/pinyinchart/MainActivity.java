package com.example.pinyinchart;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin: tells the app whether a refused microphone can still be asked for.
        registerPlugin(MicrophonePermissionPlugin.class);
        super.onCreate(savedInstanceState);
        // Draw behind the system bars on every Android version, as Capacitor's SystemBars
        // documentation recommends with insetsHandling "native"; the page pads itself
        // with env(safe-area-inset-*).
        EdgeToEdge.enable(this);
    }
}
